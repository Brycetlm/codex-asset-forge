import type { GeneratedAsset, GenerationSpec } from "./types";

const palettes: Record<string, string[][]> = {
  森语幻想: [
    ["#f6e7b0", "#e3a66f", "#55705a", "#222d2a"],
    ["#f2d49b", "#c87f55", "#4d7a68", "#182421"],
    ["#f9e8be", "#d99961", "#6c8160", "#27322d"],
    ["#efd291", "#b9744f", "#68806a", "#1c2925"],
  ],
  霓虹边界: [
    ["#8ff3ff", "#7c5cff", "#ff4db8", "#151429"],
    ["#54e8ff", "#754cf5", "#ff7dcb", "#0d1023"],
    ["#9eeeff", "#4f73ff", "#f34aa8", "#11162d"],
    ["#65f1dc", "#835ee9", "#fa5895", "#171329"],
  ],
  像素旅团: [
    ["#ffe59e", "#ea9564", "#5c7c68", "#242f33"],
    ["#f9cf72", "#db7655", "#486b61", "#1a252b"],
    ["#ffeab3", "#c98256", "#6b8267", "#2b3330"],
    ["#f5d28c", "#ee8d5c", "#55746f", "#192428"],
  ],
  曜石王庭: [
    ["#f2d28b", "#9c6a44", "#343745", "#111117"],
    ["#e6c06f", "#7d5542", "#42404f", "#15141b"],
    ["#ffdc91", "#af744d", "#2e3441", "#0d0e13"],
    ["#dcb56d", "#8d6148", "#3b3d47", "#14151b"],
  ],
  羊皮卷史诗: [["#e8d5a3", "#9b643f", "#6f2637", "#33241e"]],
  糖果工坊: [["#ffd77d", "#ff7fab", "#7fd8d0", "#604d72"]],
  深海秘境: [["#72d7d0", "#277a8b", "#654b8f", "#101f31"]],
  蒸汽机巧: [["#e2b467", "#9b5e3f", "#5d6f6b", "#252527"]],
  冰晶圣殿: [["#e5fbff", "#8dd5ee", "#788fca", "#202a48"]],
  荒漠遗迹: [["#e6c47a", "#bf7445", "#557b78", "#3b2a25"]],
  水墨江湖: [["#ece6d5", "#c54f3b", "#5d7168", "#242321"]],
  纸艺童话: [["#f4dca8", "#df8069", "#78a38c", "#4c5573"]],
};

export const seedAssets: GeneratedAsset[] = [
  {
    id: "asset-001",
    name: "主行动按钮",
    kind: "按钮",
    style: "森语幻想",
    status: "ready",
    score: 96,
    palette: palettes["森语幻想"][0],
    variant: 1,
  },
  {
    id: "asset-002",
    name: "任务详情面板",
    kind: "面板",
    style: "森语幻想",
    status: "ready",
    score: 92,
    palette: palettes["森语幻想"][1],
    variant: 2,
  },
  {
    id: "asset-003",
    name: "魔力药剂",
    kind: "图标",
    style: "霓虹边界",
    status: "ready",
    score: 89,
    palette: palettes["霓虹边界"][0],
    variant: 1,
  },
  {
    id: "asset-004",
    name: "玩家状态条",
    kind: "HUD",
    style: "曜石王庭",
    status: "ready",
    score: 94,
    palette: palettes["曜石王庭"][2],
    variant: 3,
  },
  {
    id: "asset-005",
    name: "旅行背包格",
    kind: "背包",
    style: "像素旅团",
    status: "ready",
    score: 91,
    palette: palettes["像素旅团"][1],
    variant: 2,
  },
  {
    id: "asset-006",
    name: "确认弹窗",
    kind: "弹窗",
    style: "森语幻想",
    status: "ready",
    score: 87,
    palette: palettes["森语幻想"][3],
    variant: 4,
  },
];

export function generateMockAssets(spec: GenerationSpec): GeneratedAsset[] {
  const paletteSet = palettes[spec.style] ?? palettes["森语幻想"];
  const baseName =
    spec.prompt.trim().slice(0, 12) || `${spec.style}${spec.kind}`;

  return Array.from({ length: spec.variants }, (_, index) => ({
    id: `asset-${Date.now()}-${index}`,
    name: `${baseName} · ${index + 1}`,
    kind: spec.kind,
    style: spec.style,
    status: "ready" as const,
    score: 88 + ((index * 3 + spec.prompt.length) % 10),
    palette: paletteSet[index % paletteSet.length],
    variant: index + 1,
    createdAt: new Date().toISOString(),
  }));
}

export function paletteForStyle(style: string, index = 0): string[] {
  const set = palettes[style] ?? palettes["森语幻想"];
  return set[index % set.length];
}
