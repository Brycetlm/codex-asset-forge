#!/usr/bin/env python3
"""Adaptive row/column splitter for loosely regular game asset sheets."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter1d
from scipy.signal import find_peaks


COLORS = ["#ff4d67", "#00e5ff", "#ffd43b", "#45e65f", "#c56cf0", "#ff7a2f"]


def normalize(values: np.ndarray) -> np.ndarray:
    low = float(np.quantile(values, 0.08))
    high = float(np.quantile(values, 0.98))
    if high - low < 1e-8:
        return np.zeros_like(values, dtype=np.float64)
    return np.clip((values - low) / (high - low), 0.0, 1.0)


def axis_evidence(rgb: np.ndarray, axis: str) -> np.ndarray:
    red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    warm_line = (
        (red > 45)
        & (green > 28)
        & (red > green * 1.15)
        & (green > blue * 1.22)
    )
    if axis == "x":
        delta = np.linalg.norm(rgb[:, 1:, :] - rgb[:, :-1, :], axis=2)
        delta = np.concatenate([delta[:, :1], delta], axis=1)
        warm_continuity = warm_line.mean(axis=0)
        mean_delta = delta.mean(axis=0)
        quantile = float(np.quantile(delta, 0.80))
        edge_continuity = (
            (delta > quantile).mean(axis=0)
            if quantile > 0
            else np.zeros(delta.shape[1])
        )
    else:
        delta = np.linalg.norm(rgb[1:, :, :] - rgb[:-1, :, :], axis=2)
        delta = np.concatenate([delta[:1, :], delta], axis=0)
        warm_continuity = warm_line.mean(axis=1)
        mean_delta = delta.mean(axis=1)
        quantile = float(np.quantile(delta, 0.80))
        edge_continuity = (
            (delta > quantile).mean(axis=1)
            if quantile > 0
            else np.zeros(delta.shape[0])
        )
    evidence = np.maximum(normalize(warm_continuity), normalize(edge_continuity))
    evidence = np.maximum(evidence, normalize(mean_delta) * 0.72)
    return gaussian_filter1d(evidence.astype(np.float64), sigma=0.7)


def choose_lines(score: np.ndarray, divisions: int) -> tuple[list[int], float]:
    length = len(score)
    if divisions < 1 or length < divisions + 1:
        raise ValueError("网格数量超过图片可用像素")
    target = (length - 1) / divisions
    peaks, _ = find_peaks(
        score,
        distance=max(2, int(round(target * 0.08))),
        prominence=0.035,
    )
    candidates = sorted(set([0, length - 1, *map(int, peaks)]))
    starts = sorted(
        set([0, *[value for value in candidates if value <= max(2, target * 0.40)]])
    )
    states: dict[int, tuple[float, list[int]]] = {}
    for value in starts:
        edge_penalty = 0.10 * value / max(target, 1.0)
        states[value] = (float(score[value]) - edge_penalty, [value])
    for _ in range(divisions - 1):
        next_states: dict[int, tuple[float, list[int]]] = {}
        for previous, (total, path) in states.items():
            for current in candidates:
                if current <= previous or current >= length - 1:
                    continue
                distance = current - previous
                if distance < target * 0.50 or distance > target * 1.50:
                    continue
                spacing_penalty = ((distance - target) / target) ** 2
                value = total + float(score[current]) - spacing_penalty
                existing = next_states.get(current)
                if existing is None or value > existing[0]:
                    next_states[current] = (value, [*path, current])
        states = next_states
        if not states:
            break
    best: tuple[float, list[int]] | None = None
    ends = [
        value
        for value in candidates
        if value >= (length - 1) - max(2, target * 0.40)
    ]
    for previous, (total, path) in states.items():
        for endpoint in ends:
            distance = endpoint - previous
            if distance < target * 0.68 or distance > target * 1.45:
                continue
            spacing_penalty = ((distance - target) / target) ** 2
            edge_penalty = 0.10 * ((length - 1) - endpoint) / max(target, 1.0)
            value = total + float(score[endpoint]) * 0.25 - spacing_penalty - edge_penalty
            if best is None or value > best[0]:
                best = (value, [*path, endpoint])
    if best is None:
        lines = [int(round(value)) for value in np.linspace(0, length - 1, divisions + 1)]
        return lines, 0.0
    lines = best[1]
    intervals = np.diff(lines).astype(np.float64)
    coefficient = float(np.std(intervals) / max(np.mean(intervals), 1.0))
    line_strength = float(np.mean([score[value] for value in lines[:-1]]))
    return lines, line_strength - coefficient * 0.50


def select_count(
    score: np.ndarray, requested: int, radius: int
) -> tuple[int, list[int], float, float, bool]:
    maximum = min(50, max(1, (len(score) - 1) // 8))
    requested = max(1, min(requested, maximum))
    candidates = []
    for divisions in range(max(1, requested - radius), min(maximum, requested + radius) + 1):
        lines, quality = choose_lines(score, divisions)
        candidates.append((divisions, lines, quality))
    requested_result = next(item for item in candidates if item[0] == requested)
    best = max(candidates, key=lambda item: item[2])
    reliable = best[2] >= 0.52 or (
        requested_result[2] <= 0.02 and best[2] >= 0.28
    )
    should_adjust = (
        best[0] != requested
        and reliable
        and best[2] - requested_result[2] >= 0.045
    )
    selected = best if should_adjust else requested_result
    return selected[0], selected[1], selected[2], requested_result[2], should_adjust


def make_regions(x_lines, y_lines, width, height, confidence):
    regions = []
    rows, columns = len(y_lines) - 1, len(x_lines) - 1
    for row in range(rows):
        for column in range(columns):
            left, top = x_lines[column], y_lines[row]
            right, bottom = x_lines[column + 1], y_lines[row + 1]
            cell_width = right - left + (1 if column == columns - 1 else 0)
            cell_height = bottom - top + (1 if row == rows - 1 else 0)
            region_id = row * columns + column + 1
            regions.append(
                {
                    "id": region_id,
                    "name": f"cell_r{row + 1:02d}_c{column + 1:02d}",
                    "type": "icon",
                    "active": True,
                    "x": left,
                    "y": top,
                    "width": max(1, cell_width),
                    "height": max(1, cell_height),
                    "confidence": round(confidence, 4),
                    "frame_mode": "keep",
                    "frame_inset": None,
                    "source": "adaptive_grid",
                    "grid": {
                        "row": row + 1,
                        "column": column + 1,
                        "rows": rows,
                        "columns": columns,
                    },
                }
            )
    return regions


def render_preview(image, regions, destination, max_edge):
    scale = min(1.0, max_edge / max(image.width, image.height))
    preview = image.convert("RGB")
    if scale < 1.0:
        preview = preview.resize(
            (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
            Image.Resampling.LANCZOS,
        )
    draw, font = ImageDraw.Draw(preview), ImageFont.load_default()
    for index, region in enumerate(regions):
        color = COLORS[index % len(COLORS)]
        left, top = round(region["x"] * scale), round(region["y"] * scale)
        right = round((region["x"] + region["width"] - 1) * scale)
        bottom = round((region["y"] + region["height"] - 1) * scale)
        draw.rectangle((left, top, right, bottom), outline=color, width=2)
        label = str(region["id"])
        box = draw.textbbox((0, 0), label, font=font)
        draw.rectangle(
            (left + 2, top + 2, left + 6 + box[2] - box[0], top + 4 + box[3] - box[1]),
            fill="#090b0f",
        )
        draw.text((left + 4, top + 2), label, fill=color, font=font)
    preview.save(destination)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--rows", type=int, required=True)
    parser.add_argument("--columns", type=int, required=True)
    parser.add_argument("--preview-max-edge", type=int, default=2048)
    args = parser.parse_args()
    if args.rows < 1 or args.columns < 1:
        raise SystemExit("行列数必须大于 0")
    if args.rows * args.columns > 250:
        raise SystemExit("单张图片最多支持 250 个网格")
    source, output_dir = Path(args.source).resolve(), Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    image = Image.open(source).convert("RGBA")
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    x_score, y_score = axis_evidence(rgb, "x"), axis_evidence(rgb, "y")
    columns, x_lines, column_quality, requested_column_quality, columns_adjusted = select_count(
        x_score, args.columns, 3
    )
    rows, y_lines, row_quality, requested_row_quality, rows_adjusted = select_count(
        y_score, args.rows, 2
    )
    if rows * columns > 250:
        rows, (y_lines, row_quality) = args.rows, choose_lines(y_score, args.rows)
        columns, (x_lines, column_quality) = args.columns, choose_lines(x_score, args.columns)
        rows_adjusted = columns_adjusted = False
    confidence = max(0.45, min(0.99, (row_quality + column_quality) / 2))
    regions = make_regions(x_lines, y_lines, image.width, image.height, confidence)
    manifest = {
        "schema_version": 1,
        "source": {"filename": source.name, "width": image.width, "height": image.height},
        "detector": {
            "requested_mode": "table",
            "selected_mode": "table",
            "method": "adaptive-line-dp",
            "rows_requested": args.rows,
            "columns_requested": args.columns,
            "rows_selected": rows,
            "columns_selected": columns,
            "auto_adjusted": rows_adjusted or columns_adjusted,
            "row_quality": round(row_quality, 4),
            "column_quality": round(column_quality, 4),
            "requested_row_quality": round(requested_row_quality, 4),
            "requested_column_quality": round(requested_column_quality, 4),
            "x_lines": x_lines,
            "y_lines": y_lines,
            "grids": [
                {
                    "x": 0,
                    "y": 0,
                    "width": image.width,
                    "height": image.height,
                    "rows": rows,
                    "columns": columns,
                    "prefix": "cell",
                }
            ],
        },
        "regions": regions,
    }
    manifest_path, preview_path = output_dir / "manifest.json", output_dir / "preview.png"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    render_preview(image, regions, preview_path, args.preview_max_edge)
    print(
        json.dumps(
            {
                "manifest": str(manifest_path),
                "preview": str(preview_path),
                "regions": len(regions),
                "rows": rows,
                "columns": columns,
                "auto_adjusted": rows_adjusted or columns_adjusted,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
