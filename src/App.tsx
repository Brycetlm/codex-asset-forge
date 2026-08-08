import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  Aperture,
  Archive,
  Bot,
  Box,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CirclePlus,
  CircleX,
  Copy,
  Cpu,
  Database,
  Download,
  Eye,
  ExternalLink,
  FileText,
  FolderOutput,
  Frame,
  GalleryHorizontalEnd,
  Gamepad2,
  GitBranch,
  Grid2X2,
  Image,
  ImagePlus,
  Images,
  Layers3,
  LayoutDashboard,
  ListChecks,
  ListFilter,
  LoaderCircle,
  LockKeyhole,
  Maximize2,
  Package,
  PanelTop,
  Palette,
  Play,
  Plus,
  RefreshCcw,
  Scissors,
  Search,
  Save,
  Send,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Square,
  SquareTerminal,
  Trash2,
  TriangleAlert,
  User,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import {
  assetSources,
  commonNegativePrompt,
  modelPresets,
  stylePresets,
  type StylePreset,
} from "./catalog";
import { paletteForStyle, seedAssets } from "./mock-generator";
import type {
  AssetKind,
  BackendHealth,
  GeneratedAsset,
  GenerationJob,
  GenerationSpec,
  WorkspacePage,
} from "./types";

const kinds: Array<{ name: AssetKind; icon: ReactNode }> = [
  { name: "按钮", icon: <Box size={16} /> },
  { name: "面板", icon: <PanelTop size={16} /> },
  { name: "图标", icon: <Aperture size={16} /> },
  { name: "HUD", icon: <GalleryHorizontalEnd size={16} /> },
  { name: "背包", icon: <Grid2X2 size={16} /> },
  { name: "弹窗", icon: <Frame size={16} /> },
];

const gameGenres = [
  "奇幻 RPG",
  "科幻冒险",
  "像素冒险",
  "休闲手游",
  "卡牌构筑",
  "策略经营",
  "武侠仙侠",
  "通用游戏",
];
const stateOptions = [
  "默认",
  "悬停",
  "按下",
  "选中",
  "禁用",
  "冷却",
  "空槽",
  "满槽",
];
const elementOptions = [
  "图标槽",
  "文字区域",
  "数值区域",
  "快捷键角标",
  "进度条",
  "边框装饰",
  "品质标记",
  "关闭按钮",
  "分页标签",
];
const engineOptions = ["Godot 4", "Unity", "Web / Phaser"];
const manifestDefaultTaskLimit = 200;
const manifestMaxTaskLimit = 500;

const styleReference = (index: number): CSSProperties =>
  ({
    "--style-reference-x": `${(index % 4) * (100 / 3)}%`,
    "--style-reference-y": `${Math.floor(index / 4) * 50}%`,
  }) as CSSProperties;

const styleThumb = (style: StylePreset, index: number): CSSProperties => {
  if (style.previewUrl) {
    return {
      backgroundImage: `url("${style.previewUrl}")`,
      backgroundPosition: "center",
      backgroundSize: "cover",
    };
  }
  const builtInIndex = stylePresets.findIndex(
    (preset) => preset.id === style.id,
  );
  return styleReference(builtInIndex >= 0 ? builtInIndex : index);
};

const initialSpec: GenerationSpec = {
  prompt:
    "一组森林冒险游戏的主菜单按钮，木质边框，苔藓装饰，温暖金色高光，中文文字区域留空",
  kind: "按钮",
  gameGenre: "奇幻 RPG",
  useCase: "主菜单的核心入口按钮",
  states: ["默认", "悬停", "按下", "禁用"],
  elements: ["文字区域", "边框装饰"],
  engine: "Godot 4",
  style: "森语幻想",
  stylePrompt: stylePresets[0].prompt,
  negativePrompt: commonNegativePrompt,
  size: "512 × 256",
  variants: 4,
  transparent: true,
  styleLock: true,
};

function compilePromptPreview(spec: GenerationSpec) {
  return [
    `为「${spec.gameGenre}」制作可直接进入 ${spec.engine} 的${spec.kind}。`,
    `核心需求：${spec.prompt}`,
    `使用场景：${spec.useCase || "核心游戏交互"}。`,
    `必须覆盖的状态：${spec.states.length ? spec.states.join("、") : "默认"}。`,
    `必须预留的内容：${spec.elements.length ? spec.elements.join("、") : "仅核心视觉"}。`,
    `视觉风格：${spec.style}；${spec.stylePrompt || "生产级 2D 游戏 UI"}。`,
    `输出：${spec.size}，${spec.variants} 个变体，${spec.transparent ? "透明 PNG" : "审稿背景"}，${spec.styleLock ? "锁定统一的线条、配色、材质与光源" : "允许受控变化"}。`,
    spec.reference
      ? `参考：${spec.reference.name}（只参考构图、边框、材质或图标轮廓，不照搬文字与标志）。`
      : "参考：未提供，系统将严格按结构化规格生成。",
    spec.taskMeta
      ? `交付命名：${spec.taskMeta.runtimePath}/${spec.taskMeta.fileName}（资产 ID：${spec.taskMeta.assetId}）。`
      : "",
    `避免：${spec.negativePrompt || commonNegativePrompt}。`,
  ]
    .filter(Boolean)
    .join("\n");
}

const pageMeta: Record<
  WorkspacePage,
  { eyebrow: string; title: string; description: string }
> = {
  creator: {
    eyebrow: "创作台 / 生成 UI 组件",
    title: "界面素材工坊",
    description: "用本机 Codex 自动生成、检查并整理 2D 游戏 UI",
  },
  "style-studio": {
    eyebrow: "工作区 / 美术方向",
    title: "风格工作室",
    description: "与 Codex 持续对话、试图和定稿可批量复现的视觉风格",
  },
  library: {
    eyebrow: "工作区 / 素材管理",
    title: "素材库",
    description: "浏览、筛选与复用项目内的全部素材",
  },
  kits: {
    eyebrow: "工作区 / 设计系统",
    title: "组件套装",
    description: "按风格组织一整套可复用 UI 组件",
  },
  history: {
    eyebrow: "工作区 / 本地任务",
    title: "生成记录",
    description: "查看 Codex 任务状态、输出与失败信息",
  },
  manifest: {
    eyebrow: "工作区 / 制作规划",
    title: "清单任务",
    description: "让 Codex 把长篇素材清单转换成可执行、可交付的标准任务",
  },
  "split-sheet": {
    eyebrow: "工具 / 素材处理",
    title: "智能拆图",
    description: "自动识别整张素材表，并按原始像素无损导出独立 PNG",
  },
  "nine-slice": {
    eyebrow: "工具 / 切图",
    title: "九宫格切片",
    description: "为可拉伸面板与按钮定义安全边界",
  },
  atlas: {
    eyebrow: "工具 / 优化",
    title: "图集打包",
    description: "选择素材并预览精灵图集布局",
  },
  export: {
    eyebrow: "工具 / 交付",
    title: "引擎导出",
    description: "生成 Godot、Unity 或 Web 可用的资源包",
  },
};

interface ResourceStatus {
  id: string;
  installed: boolean;
  fileCount: number;
  path: string | null;
  license: string;
}

interface StyleStudioMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  referenceUrl?: string | null;
  versionId?: string;
}

interface StyleStudioPreview {
  url: string;
  jobId: string;
  createdAt: string;
}

interface StyleStudioVersion {
  id: string;
  parentId: string | null;
  mode: "refine" | "derive" | "branch";
  createdAt: string;
  label: string;
  userRequest: string;
  dna: StylePreset;
  previews: StyleStudioPreview[];
  anchorUrls: string[];
  previewJobId?: string | null;
}

interface StyleStudioProject {
  id: string;
  name: string;
  brief: string;
  status: "draft" | "saved";
  createdAt: string;
  updatedAt: string;
  currentVersionId: string | null;
  savedStyleId: string | null;
  messages: StyleStudioMessage[];
  versions: StyleStudioVersion[];
}

interface ResourceFile {
  name: string;
  url: string;
  relativePath: string;
}

interface JobLogDetail {
  id: string;
  status: string;
  stage: string;
  error: string | null;
  log: string;
  updatedAt: string;
}

interface SplitRegion {
  id: number;
  name: string;
  type: string;
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface SplitSession {
  id: string;
  sourceName: string;
  sourceUrl: string;
  previewUrl: string;
  mode: "frames" | "layout" | "table";
  regions: SplitRegion[];
  grid?: {
    requestedRows: number;
    requestedColumns: number;
    rows: number;
    columns: number;
    autoAdjusted: boolean;
    rowQuality: number | null;
    columnQuality: number | null;
  } | null;
}

interface SplitExport {
  exported: number;
  zipUrl: string;
  assetsUrl: string;
  files: Array<{
    id: number;
    name: string;
    url: string;
    width: number;
    height: number;
    frameMode: "keep" | "remove";
    resampled: boolean;
  }>;
}

interface SplitQueueItem {
  localId: string;
  file: File;
  status: "queued" | "analyzing" | "ready" | "failed";
  session: SplitSession | null;
  exportResult: SplitExport | null;
  frameMode: "keep" | "remove";
  error?: string;
}

interface AssetTask {
  taskId: string;
  assetId: string;
  displayName: string;
  priority: "P0" | "P1" | "P2";
  status:
    | "NOT_STARTED"
    | "QUEUED"
    | "RUNNING"
    | "REVIEW"
    | "APPROVED"
    | "FAILED";
  progress: number;
  stage: string;
  jobId: string | null;
  attempts: number;
  outputUrls: string[];
  selectedOutputUrl: string;
  error: string | null;
  lastGeneratedAt: string | null;
  approvedAt: string | null;
  adoptedFileUrl: string;
  adoptedRelativePath: string;
  adoptedFiles: Array<{
    fileName: string;
    relativePath: string;
    url: string;
    sourceOutputUrl: string;
    role: "deliverable" | "supplementary";
  }>;
  assetMetadataUrl: string;
  assetMetadataRelativePath: string;
  assetsCatalogUrl: string;
  batchId: string | null;
  batchSize: number;
  batchPosition: number;
  batchLabel: string;
  assetType: string;
  kind: AssetKind;
  category: string;
  system: string;
  description: string;
  useCase: string;
  quantity: number;
  size: string;
  format: string;
  transparent: boolean;
  ninePatch: boolean;
  states: string[];
  elements: string[];
  generationMode: string;
  variants: number;
  fileName: string;
  runtimePath: string;
  prompt: string;
  styleName: string;
  stylePrompt: string;
  negativePrompt: string;
  technicalRequirements: string[];
  acceptanceCriteria: string[];
  sourceRefs: string[];
}

const manifestTaskStatus = {
  NOT_STARTED: "未开始",
  QUEUED: "排队中",
  RUNNING: "生成中",
  REVIEW: "待审核",
  APPROVED: "已采用",
  FAILED: "失败",
} satisfies Record<AssetTask["status"], string>;

type ManifestStatusFilter = AssetTask["status"] | "全部";

const manifestStatusFilters: Array<{
  value: ManifestStatusFilter;
  label: string;
}> = [
  { value: "全部", label: "全部状态" },
  { value: "FAILED", label: "失败" },
  { value: "REVIEW", label: "待审核" },
  { value: "NOT_STARTED", label: "未开始" },
  { value: "QUEUED", label: "排队中" },
  { value: "RUNNING", label: "生成中" },
  { value: "APPROVED", label: "已采用" },
];

function formatTaskDuration(startValue?: string, endValue?: string | number) {
  if (!startValue) return "";
  const start = new Date(startValue).getTime();
  const end =
    typeof endValue === "number"
      ? endValue
      : endValue
        ? new Date(endValue).getTime()
        : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
    return "";
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}分${remainingSeconds}秒`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}小时${remainingMinutes}分`;
}

interface GenerationFailureView {
  title: string;
  message: string;
  detail: string;
  jobId?: string;
  elapsed?: string;
}

function describeGenerationFailure(
  detailValue: string,
  job?: GenerationJob | null,
): GenerationFailureView {
  const detail = String(
    job?.errorDetail || job?.error || detailValue || "没有可用的错误信息",
  ).trim();
  const normalized = detail.toLowerCase();
  let title = "参考图生成失败";
  let message =
    job?.error ||
    detailValue ||
    "本次任务没有生成可用图片，请查看技术详情后重试。";

  if (
    normalized.includes("/images/generations") &&
    (normalized.includes("network error") ||
      normalized.includes("error sending request"))
  ) {
    title = "图片服务网络连接失败";
    message =
      "Codex 已接到任务，但连接图片生成服务时断线。本次没有生成文件，请在网络稳定后重新生成。";
  } else if (normalized.includes("num_last_images_to_include")) {
    title = "参考图数量不符合要求";
    message =
      "传给 Codex 的参考图数量超出允许范围。本次未生成图片，请调整参考图后重试。";
  } else if (
    normalized.includes("没有发现素材文件") ||
    normalized.includes("没有发现素材") ||
    normalized.includes("未输出图片")
  ) {
    title = "没有找到生成结果";
    message =
      "Codex 已结束任务，但输出目录里没有发现图片。本次结果不可用，可以直接重新生成。";
  } else if (
    job?.status === "interrupted" &&
    /用户停止|取消排队/.test(job.stage || "")
  ) {
    title = "已停止本次生成";
    message = "这次任务已按你的操作停止，没有完成的方案不会被当作可用结果。";
  } else if (job?.status === "interrupted") {
    title = "任务已中断";
    message = "应用或本地服务曾重启，这次生成没有完成，请重新生成。";
  }

  return {
    title,
    message,
    detail,
    jobId: job?.id,
    elapsed: formatTaskDuration(
      job?.startedAt || job?.createdAt,
      job?.completedAt || Date.now(),
    ),
  };
}

function formatReferenceBytes(bytes?: number) {
  if (!bytes || !Number.isFinite(bytes)) return "大小读取中";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function manifestTaskUsesOutputBundle(task: AssetTask) {
  return (
    task.outputUrls.length > 1 &&
    ((task.quantity > 1 && task.variants === 1) ||
      task.format.includes("+"))
  );
}

function manifestOutputFileName(url: string) {
  try {
    return decodeURIComponent(new URL(url, window.location.origin).pathname)
      .split("/")
      .filter(Boolean)
      .at(-1) || "生成文件";
  } catch {
    return "生成文件";
  }
}

function isVisualOutputUrl(url: string) {
  try {
    return /\.(?:png|webp|jpe?g|svg)$/i.test(
      new URL(url, window.location.origin).pathname,
    );
  } catch {
    return false;
  }
}

function manifestOutputTypeLabel(url: string) {
  const fileName = manifestOutputFileName(url);
  const extension = fileName.split(".").at(-1);
  return extension ? extension.toUpperCase() : "FILE";
}

interface AssetTaskManifest {
  schemaVersion: string;
  manifestId: string;
  source: {
    name: string;
    importedAt: string;
    documentUrl: string;
  };
  project: {
    name: string;
    engine: string;
    designResolution: string;
    artDirection: string;
    outputRoot: string;
    summary: string;
  };
  taskCount: number;
  extractedTaskCount: number;
  taskLimit: number;
  taskLimitReached: boolean;
  sectionLimitReached: boolean;
  limitWarningType: "total" | "section" | "";
  droppedTaskCount: number;
  limitWarning: string;
  stats: {
    byPriority: Record<"P0" | "P1" | "P2", number>;
    byType: Record<string, number>;
  };
  createdAt: string;
  tasks: AssetTask[];
}

interface AssetManifestRun {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "interrupted";
  stage: string;
  progress: number;
  sourceName: string;
  createdAt: string;
  updatedAt: string;
  error: string | null;
  manifestUrl: string | null;
  projectName?: string;
  taskCount?: number;
  taskStatusCounts?: Record<string, number>;
  limitWarning?: string;
  limitWarningType?: "total" | "section" | "";
  lastQueueSubmission?: {
    createdAt: string;
    submittedCount: number;
    requestedCount: number;
    acceptedCount: number;
    batchCount: number;
    skippedCount: number;
    duplicateCount: number;
    skipped: Array<{ taskId: string; reason: string }>;
  };
  config?: {
    projectName: string;
    engine: string;
    outputRoot: string;
    styleName: string;
    stylePrompt: string;
    negativePrompt: string;
    maxTasks: number;
  };
  workspaceState?: {
    projectName: string;
    engine: string;
    outputRoot: string;
    styleMode: "preset" | "custom";
    styleId: string;
    customStyleName: string;
    customStyleText: string;
    customStyleNegativePrompt: string;
    referenceStylePrompt: string;
    styleMergeMode: "append" | "replace";
    styleReference?: GenerationSpec["reference"];
    attachStyleReference: boolean;
    maxTasks: number;
    batchSize: number;
    concurrency: number;
    search: string;
    priority: "全部" | "P0" | "P1" | "P2";
    status: ManifestStatusFilter;
    selectedTaskId: string;
    selectedTaskIds: string[];
    sourceCollapsed: boolean;
  };
  sourceText?: string;
  manifest?: AssetTaskManifest;
}

const navGroups: Array<{
  label: string;
  items: Array<{ id: WorkspacePage; label: string; icon: ReactNode }>;
}> = [
  {
    label: "工作区",
    items: [
      { id: "creator", label: "创作台", icon: <Sparkles size={17} /> },
      { id: "style-studio", label: "风格工作室", icon: <Palette size={17} /> },
      { id: "manifest", label: "清单任务", icon: <ListChecks size={17} /> },
      { id: "library", label: "素材库", icon: <LayoutDashboard size={17} /> },
      { id: "kits", label: "组件套装", icon: <Layers3 size={17} /> },
      { id: "history", label: "生成记录", icon: <Archive size={17} /> },
    ],
  },
  {
    label: "工具",
    items: [
      { id: "split-sheet", label: "智能拆图", icon: <Images size={17} /> },
      { id: "nine-slice", label: "九宫格切片", icon: <Scissors size={17} /> },
      { id: "atlas", label: "图集打包", icon: <Frame size={17} /> },
      { id: "export", label: "引擎导出", icon: <Download size={17} /> },
    ],
  },
];

const cssVars = (asset: GeneratedAsset) =>
  ({
    "--p1": asset.palette[0],
    "--p2": asset.palette[1],
    "--p3": asset.palette[2],
    "--p4": asset.palette[3],
  }) as CSSProperties;

function AssetPreview({
  asset,
  large = false,
}: {
  asset: GeneratedAsset;
  large?: boolean;
}) {
  return (
    <div
      className={`asset-preview ${large ? "asset-preview-large" : ""}`}
      style={cssVars(asset)}
    >
      {asset.imageUrl ? (
        <img
          className="generated-image"
          src={asset.imageUrl}
          alt={asset.name}
        />
      ) : (
        <>
          <div className="preview-radiance" />
          {asset.kind === "按钮" && (
            <div className="mock-button">
              <i className="button-leaf left" />
              <span>开始旅程</span>
              <i className="button-leaf right" />
            </div>
          )}
          {asset.kind === "面板" && (
            <div className="mock-panel">
              <div className="mock-panel-title">
                <span />
                任务日志
                <span />
              </div>
              <div className="mock-panel-body">
                <b />
                <b />
                <b className="short" />
              </div>
            </div>
          )}
          {asset.kind === "图标" && (
            <div className="mock-icon">
              <div className="gem-core" />
              <div className="gem-glint" />
            </div>
          )}
          {asset.kind === "HUD" && (
            <div className="mock-hud">
              <div className="avatar-ring">
                <span />
              </div>
              <div className="hud-bars">
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
          {asset.kind === "背包" && (
            <div className="mock-inventory">
              {Array.from({ length: 9 }, (_, index) => (
                <i key={index} className={index < 3 ? "filled" : ""} />
              ))}
            </div>
          )}
          {asset.kind === "弹窗" && (
            <div className="mock-dialog">
              <div className="dialog-crest">✦</div>
              <strong>确认选择？</strong>
              <span>即将使用这件珍贵物品</span>
              <div>
                <i>取消</i>
                <i>确认</i>
              </div>
            </div>
          )}
          <div className="preview-grid" />
        </>
      )}
      {asset.status !== "ready" && (
        <div className={`asset-state ${asset.status}`}>
          <LoaderCircle
            className={asset.status === "failed" ? "" : "spin"}
            size={18}
          />
          {asset.status === "failed" ? "生成失败" : "Codex 生成中"}
        </div>
      )}
    </div>
  );
}

function AssetCard({
  asset,
  selected,
  onClick,
  large = false,
  selectable = false,
}: {
  asset: GeneratedAsset;
  selected: boolean;
  onClick: () => void;
  large?: boolean;
  selectable?: boolean;
}) {
  return (
    <button
      className={`asset-card ${selected ? "selected" : ""}`}
      onClick={onClick}
    >
      <AssetPreview asset={asset} large={large} />
      <div className="asset-meta">
        <span>
          <strong>{asset.name}</strong>
          <small>
            {asset.style} · 变体 {asset.variant}
          </small>
        </span>
        <b className={asset.score >= 93 ? "excellent" : ""}>
          {asset.score || "—"}
        </b>
      </div>
      {selected && (
        <span className="selected-badge">
          <Check size={12} />
          {selectable ? "已加入" : "已选择"}
        </span>
      )}
    </button>
  );
}

function assetsFromJob(job: GenerationJob): GeneratedAsset[] {
  return job.outputUrls
    .filter(isVisualOutputUrl)
    .map((imageUrl, index) => ({
      id: `${job.id}-${index}`,
      jobId: job.id,
      imageUrl,
      createdAt: job.completedAt,
      name: `${job.spec.kind} · Codex ${index + 1}`,
      kind: job.spec.kind,
      style: job.spec.style,
      status: "ready",
      score: 94,
      palette: paletteForStyle(job.spec.style, index),
      variant: index + 1,
    }));
}

function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div>{icon}</div>
      <strong>{title}</strong>
      <span>{text}</span>
      {action}
    </div>
  );
}

function App() {
  const [page, setPage] = useState<WorkspacePage>("creator");
  const [spec, setSpec] = useState<GenerationSpec>(initialSpec);
  const [assets, setAssets] = useState<GeneratedAsset[]>(seedAssets);
  const [selectedId, setSelectedId] = useState(seedAssets[0].id);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [customStyles, setCustomStyles] = useState<StylePreset[]>([]);
  const [styleProjects, setStyleProjects] = useState<StyleStudioProject[]>([]);
  const [activeStyleProjectId, setActiveStyleProjectId] = useState<
    string | null
  >(null);
  const [customStyleOpen, setCustomStyleOpen] = useState(false);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [showCompiledPrompt, setShowCompiledPrompt] = useState(false);
  const [jobLog, setJobLog] = useState<JobLogDetail | null>(null);
  const [loadingJobLog, setLoadingJobLog] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [filter, setFilter] = useState<AssetKind | "全部">("全部");
  const [galleryMode, setGalleryMode] = useState<"grid" | "focus">("grid");
  const [search, setSearch] = useState("");
  const [libraryView, setLibraryView] = useState<"project" | "sources">(
    "project",
  );
  const [resourceStatuses, setResourceStatuses] = useState<ResourceStatus[]>(
    [],
  );
  const [importingResource, setImportingResource] = useState<string | null>(
    null,
  );
  const [browsingResource, setBrowsingResource] = useState<string | null>(null);
  const [resourceFiles, setResourceFiles] = useState<ResourceFile[]>([]);
  const [modal, setModal] = useState<
    "flow" | "search" | "styles" | "preview" | "settings" | null
  >(null);
  const [toast, setToast] = useState<string | null>(null);
  const [atlasIds, setAtlasIds] = useState<string[]>(
    seedAssets.slice(0, 4).map((asset) => asset.id),
  );
  const [slice, setSlice] = useState({
    top: 24,
    right: 24,
    bottom: 24,
    left: 24,
  });
  const [engine, setEngine] = useState<"Godot 4" | "Unity" | "Web / Phaser">(
    "Godot 4",
  );
  const [exportScale, setExportScale] = useState("2×");
  const [splitMode, setSplitMode] = useState<
    "auto" | "frames" | "layout" | "table"
  >("auto");
  const [splitGridRows, setSplitGridRows] = useState(6);
  const [splitGridColumns, setSplitGridColumns] = useState(18);
  const [splitItems, setSplitItems] = useState<SplitQueueItem[]>([]);
  const [activeSplitId, setActiveSplitId] = useState<string | null>(null);
  const [splitExportingId, setSplitExportingId] = useState<string | null>(null);
  const splitFileInputRef = useRef<HTMLInputElement>(null);
  const manifestFileInputRef = useRef<HTMLInputElement>(null);
  const manifestStyleFileInputRef = useRef<HTMLInputElement>(null);
  const manifestStyleImageInputRef = useRef<HTMLInputElement>(null);
  const manifestBatchReferenceInputRef = useRef<HTMLInputElement>(null);
  const [manifestSourceText, setManifestSourceText] = useState("");
  const [manifestSourceName, setManifestSourceName] = useState("");
  const [manifestProjectName, setManifestProjectName] = useState("");
  const [manifestEngine, setManifestEngine] = useState("Godot 4");
  const [manifestOutputRoot, setManifestOutputRoot] =
    useState("assets/art/ui/");
  const [manifestStyleId, setManifestStyleId] = useState("forest-fantasy");
  const [manifestStyleMode, setManifestStyleMode] = useState<
    "preset" | "custom"
  >("preset");
  const [manifestCustomStyleText, setManifestCustomStyleText] = useState("");
  const [manifestCustomStyleName, setManifestCustomStyleName] = useState("");
  const [
    manifestCustomStyleNegativePrompt,
    setManifestCustomStyleNegativePrompt,
  ] = useState("");
  const [manifestReferenceStylePrompt, setManifestReferenceStylePrompt] =
    useState("");
  const [manifestStyleMergeMode, setManifestStyleMergeMode] = useState<
    "append" | "replace"
  >("append");
  const [manifestStyleReference, setManifestStyleReference] =
    useState<GenerationSpec["reference"]>();
  const [manifestAttachStyleReference, setManifestAttachStyleReference] =
    useState(false);
  const [manifestStyleImageUploading, setManifestStyleImageUploading] =
    useState(false);
  const [manifestStyleCompiling, setManifestStyleCompiling] = useState(false);
  const [manifestBatchReferenceUploading, setManifestBatchReferenceUploading] =
    useState(false);
  const [manifestBatchReferenceInfo, setManifestBatchReferenceInfo] = useState<{
    width?: number;
    height?: number;
    bytes?: number;
  }>({});
  const [manifestMaxTasks, setManifestMaxTasks] = useState(
    manifestDefaultTaskLimit,
  );
  const [manifestBatchSize, setManifestBatchSize] = useState(5);
  const [manifestConcurrency, setManifestConcurrency] = useState(2);
  const [manifestSourceCollapsed, setManifestSourceCollapsed] = useState(false);
  const [manifestPreviewUrl, setManifestPreviewUrl] = useState<string | null>(
    null,
  );
  const [manifestRun, setManifestRun] = useState<AssetManifestRun | null>(null);
  const [manifestRuns, setManifestRuns] = useState<AssetManifestRun[]>([]);
  const [manifestAnalyzing, setManifestAnalyzing] = useState(false);
  const [manifestSaving, setManifestSaving] = useState(false);
  const [manifestSearch, setManifestSearch] = useState("");
  const [manifestPriority, setManifestPriority] = useState<
    "全部" | "P0" | "P1" | "P2"
  >("全部");
  const [manifestStatus, setManifestStatus] =
    useState<ManifestStatusFilter>("全部");
  const [selectedManifestTaskId, setSelectedManifestTaskId] = useState<
    string | null
  >(null);
  const [selectedManifestTaskIds, setSelectedManifestTaskIds] = useState<
    string[]
  >([]);
  const [manifestQueueing, setManifestQueueing] = useState(false);
  const [manifestApproving, setManifestApproving] = useState(false);
  const [manifestApproveProgress, setManifestApproveProgress] = useState({
    completed: 0,
    total: 0,
  });
  const [manifestClock, setManifestClock] = useState(() => Date.now());

  const selected = assets.find((asset) => asset.id === selectedId) ?? assets[0];
  const activeSplitItem =
    splitItems.find((item) => item.localId === activeSplitId) ?? splitItems[0];
  const splitSession = activeSplitItem?.session ?? null;
  const splitExport = activeSplitItem?.exportResult ?? null;
  const splitFrameMode = activeSplitItem?.frameMode ?? "keep";
  const splitBusy =
    activeSplitItem?.status === "queued" ||
    activeSplitItem?.status === "analyzing"
      ? "analyze"
      : splitExportingId === activeSplitItem?.localId
        ? "export"
        : null;
  const allStyles = useMemo(
    () => [...customStyles, ...stylePresets],
    [customStyles],
  );
  const manifestStyle =
    allStyles.find((style) => style.id === manifestStyleId) ?? allStyles[0];
  const manifestSavedStyleReferences = useMemo<
    NonNullable<GenerationSpec["reference"]>[]
  >(() => {
    if (
      manifestStyleMode !== "preset" ||
      !manifestStyle?.custom ||
      !manifestStyle.previewUrl
    ) {
      return [];
    }
    const urls = [
      ...new Set(
        (manifestStyle.anchorUrls?.length
          ? manifestStyle.anchorUrls
          : [manifestStyle.previewUrl]
        ).filter((url): url is string => Boolean(url)),
      ),
    ];
    const references: NonNullable<GenerationSpec["reference"]>[] = [];
    urls.forEach((url, index) => {
      const path = url.replace(/^\/+/, "");
      if (path.startsWith("outputs/")) {
        references.push({
          name: `${manifestStyle.name} · 风格锚点 ${index + 1}`,
          path,
          url,
          source: "library",
        });
      }
    });
    return references;
  }, [manifestStyle, manifestStyleMode]);
  const manifestSavedStyleReference = manifestSavedStyleReferences[0];
  const manifestBatchStyleReference =
    manifestStyleReference || manifestSavedStyleReference;
  const manifestBatchReferenceIsSavedAnchor = Boolean(
    manifestBatchStyleReference &&
      manifestSavedStyleReferences.some(
        (reference) => reference.url === manifestBatchStyleReference.url,
      ),
  );
  const manifestBatchReferenceForSubmission = manifestBatchStyleReference
    ? {
        ...manifestBatchStyleReference,
        ...manifestBatchReferenceInfo,
      }
    : undefined;
  const manifestEffectiveCustomStylePrompt = useMemo(() => {
    const original = manifestCustomStyleText.trim();
    const referenceStyle = manifestReferenceStylePrompt.trim();
    if (!referenceStyle) return original;
    if (manifestStyleMergeMode === "replace") return referenceStyle;
    return [
      original,
      `Reference image visual style DNA:\n${referenceStyle}`,
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 50_000);
  }, [
    manifestCustomStyleText,
    manifestReferenceStylePrompt,
    manifestStyleMergeMode,
  ]);
  const manifestTasks = manifestRun?.manifest?.tasks ?? [];
  const manifestProgressStats = useMemo(() => {
    const automaticTasks = manifestTasks.filter(
      (task) => task.generationMode !== "manual",
    );
    const generated = automaticTasks.filter((task) =>
      ["REVIEW", "APPROVED"].includes(task.status),
    ).length;
    const approved = automaticTasks.filter(
      (task) => task.status === "APPROVED",
    ).length;
    const active = automaticTasks.filter(
      (task) => task.status === "QUEUED" || task.status === "RUNNING",
    ).length;
    const failed = automaticTasks.filter(
      (task) => task.status === "FAILED",
    ).length;
    const pending = Math.max(
      0,
      automaticTasks.length - generated - active - failed,
    );
    const progress = automaticTasks.length
      ? Math.round(
          automaticTasks.reduce((total, task) => {
            if (task.status === "REVIEW" || task.status === "APPROVED")
              return total + 100;
            if (task.status === "QUEUED" || task.status === "RUNNING")
              return total + Math.max(0, Math.min(100, task.progress || 0));
            return total;
          }, 0) / automaticTasks.length,
        )
      : 0;
    return {
      total: automaticTasks.length,
      generated,
      approved,
      active,
      failed,
      pending,
      manual: manifestTasks.length - automaticTasks.length,
      progress,
    };
  }, [manifestTasks]);
  const visibleManifestTasks = useMemo(
    () =>
      manifestTasks.filter(
        (task) =>
          (manifestPriority === "全部" ||
            task.priority === manifestPriority) &&
          (manifestStatus === "全部" || task.status === manifestStatus) &&
          (!manifestSearch ||
            `${task.assetId}${task.displayName}${task.category}${task.system}`
              .toLowerCase()
              .includes(manifestSearch.toLowerCase())),
      ),
    [manifestTasks, manifestPriority, manifestStatus, manifestSearch],
  );
  const manifestStatusCounts = useMemo(
    () =>
      manifestTasks.reduce(
        (counts, task) => {
          counts[task.status] += 1;
          return counts;
        },
        {
          NOT_STARTED: 0,
          QUEUED: 0,
          RUNNING: 0,
          REVIEW: 0,
          APPROVED: 0,
          FAILED: 0,
        } satisfies Record<AssetTask["status"], number>,
      ),
    [manifestTasks],
  );
  const selectedReviewTasks = useMemo(() => {
    const selectedIds = new Set(selectedManifestTaskIds);
    return manifestTasks.filter(
      (task) =>
        selectedIds.has(task.taskId) &&
        task.status === "REVIEW" &&
        Boolean(task.selectedOutputUrl || task.outputUrls[0]),
    );
  }, [manifestTasks, selectedManifestTaskIds]);
  const visibleManifestBatches = useMemo(() => {
    const batches: Array<{
      id: string;
      label: string;
      tasks: AssetTask[];
      persisted: boolean;
    }> = [];
    const persisted = new Map<string, (typeof batches)[number]>();
    const virtual = new Map<string, (typeof batches)[number]>();
    for (const task of visibleManifestTasks) {
      if (task.batchId) {
        let batch = persisted.get(task.batchId);
        if (!batch) {
          batch = {
            id: task.batchId,
            label:
              task.batchLabel ||
              `${task.styleName} · ${task.kind}`,
            tasks: [],
            persisted: true,
          };
          persisted.set(task.batchId, batch);
          batches.push(batch);
        }
        batch.tasks.push(task);
        continue;
      }
      const compatibilityKey = `${task.styleName}::${task.kind}`;
      let batch = virtual.get(compatibilityKey);
      if (!batch || batch.tasks.length >= manifestBatchSize) {
        batch = {
          id: `preview-${compatibilityKey}-${batches.length + 1}`,
          label: `${task.styleName} · ${task.kind}`,
          tasks: [],
          persisted: false,
        };
        virtual.set(compatibilityKey, batch);
        batches.push(batch);
      }
      batch.tasks.push(task);
    }
    return batches;
  }, [visibleManifestTasks, manifestBatchSize]);
  const selectedManifestTask =
    manifestTasks.find((task) => task.taskId === selectedManifestTaskId) ??
    manifestTasks[0] ??
    null;
  const selectedManifestTaskIsBundle = selectedManifestTask
    ? manifestTaskUsesOutputBundle(selectedManifestTask)
    : false;
  const selectedManifestBundleDeliverables = selectedManifestTaskIsBundle
    ? Math.min(
        selectedManifestTask!.quantity,
        selectedManifestTask!.outputUrls.length,
      )
    : 0;
  const selectedManifestBundleExtras = selectedManifestTaskIsBundle
    ? Math.max(
        0,
        selectedManifestTask!.outputUrls.length -
          selectedManifestBundleDeliverables,
      )
    : 0;
  const manifestHasActiveTasks = manifestTasks.some(
    (task) => task.status === "QUEUED" || task.status === "RUNNING",
  );
  const manifestJobsById = useMemo(
    () => new Map(jobs.map((job) => [job.id, job])),
    [jobs],
  );
  const manifestTaskTiming = (task: AssetTask) => {
    const job = task.jobId ? manifestJobsById.get(task.jobId) : undefined;
    if (!job) return "";
    if (task.status === "QUEUED") {
      if (job.startedAt)
        return `批内等待 ${formatTaskDuration(job.startedAt, manifestClock)}`;
      return `排队 ${formatTaskDuration(job.createdAt, manifestClock)}`;
    }
    if (task.status === "RUNNING") {
      return `执行 ${formatTaskDuration(
        job.startedAt || job.createdAt,
        manifestClock,
      )}`;
    }
    if (
      task.status === "REVIEW" ||
      task.status === "APPROVED" ||
      task.status === "FAILED"
    ) {
      const finishedAt = job.completedAt || job.updatedAt;
      return `耗时 ${formatTaskDuration(
        job.startedAt || job.createdAt,
        finishedAt,
      )}`;
    }
    return "";
  };
  const visibleAssets = useMemo(
    () =>
      assets.filter(
        (asset) =>
          (filter === "全部" || asset.kind === filter) &&
          (!search ||
            `${asset.name}${asset.kind}${asset.style}`
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [assets, filter, search],
  );
  const compiledPrompt = useMemo(() => compilePromptPreview(spec), [spec]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const refreshJobs = useCallback(async () => {
    try {
      const response = await fetch("/api/jobs");
      if (response.ok) {
        const nextJobs: GenerationJob[] = await response.json();
        setJobs(nextJobs);
        const restored = nextJobs
          .filter((job) => job.status === "completed")
          .flatMap(assetsFromJob);
        setAssets((current) => {
          const known = new Set(current.map((asset) => asset.id));
          return [
            ...restored.filter((asset) => !known.has(asset.id)),
            ...current,
          ];
        });
      }
    } catch {}
  }, []);

  const refreshResources = useCallback(async () => {
    try {
      const response = await fetch("/api/resources");
      if (response.ok) setResourceStatuses(await response.json());
    } catch {}
  }, []);

  const refreshCustomStyles = useCallback(async () => {
    try {
      const response = await fetch("/api/styles");
      if (response.ok) setCustomStyles(await response.json());
    } catch {}
  }, []);

  const refreshStyleProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/style-projects");
      if (!response.ok) return;
      const projects: StyleStudioProject[] = await response.json();
      setStyleProjects(projects);
      setActiveStyleProjectId((current) =>
        current && projects.some((project) => project.id === current)
          ? current
          : projects[0]?.id || null,
      );
    } catch {}
  }, []);

  const refreshManifestRuns = useCallback(async () => {
    try {
      const response = await fetch("/api/asset-manifests");
      if (response.ok) setManifestRuns(await response.json());
    } catch {}
  }, []);

  useEffect(() => {
    void fetch("/api/health")
      .then(async (response) => setHealth(await response.json()))
      .catch(() => setHealth(null));
    void refreshJobs();
    void refreshResources();
    void refreshCustomStyles();
    void refreshStyleProjects();
    void refreshManifestRuns();
  }, [
    refreshJobs,
    refreshResources,
    refreshCustomStyles,
    refreshStyleProjects,
    refreshManifestRuns,
  ]);

  useEffect(() => {
    const reference = manifestBatchStyleReference;
    if (!reference) {
      setManifestBatchReferenceInfo({});
      return;
    }
    let active = true;
    setManifestBatchReferenceInfo({
      width: reference.width,
      height: reference.height,
      bytes: reference.bytes,
    });
    const image = new window.Image();
    image.onload = () => {
      if (!active) return;
      setManifestBatchReferenceInfo((current) => ({
        ...current,
        width: current.width || image.naturalWidth,
        height: current.height || image.naturalHeight,
      }));
    };
    image.src = reference.url;
    if (!reference.bytes) {
      void fetch(reference.url)
        .then((response) => (response.ok ? response.blob() : null))
        .then((blob) => {
          if (!active || !blob) return;
          setManifestBatchReferenceInfo((current) => ({
            ...current,
            bytes: blob.size,
          }));
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [manifestBatchStyleReference?.url]);

  useEffect(() => {
    if (!manifestRun?.id || !manifestHasActiveTasks) return;
    const timer = window.setInterval(() => {
      void fetch(`/api/asset-manifests/${manifestRun.id}`)
        .then(async (response) => {
          if (!response.ok) return;
          setManifestRun(await response.json());
        })
        .catch(() => {});
      void refreshJobs();
    }, 1200);
    return () => window.clearInterval(timer);
  }, [manifestRun?.id, manifestHasActiveTasks, refreshJobs]);

  useEffect(() => {
    if (!manifestHasActiveTasks) return;
    setManifestClock(Date.now());
    const timer = window.setInterval(
      () => setManifestClock(Date.now()),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [manifestHasActiveTasks]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        !event.defaultPrevented &&
        page === "creator" &&
        !modal &&
        (event.metaKey || event.ctrlKey) &&
        event.key === "Enter"
      ) {
        event.preventDefault();
        void runGeneration();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setModal("search");
      }
      if (event.key === "Escape") {
        setModal(null);
        setManifestPreviewUrl(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const updateSpec = <K extends keyof GenerationSpec>(
    key: K,
    value: GenerationSpec[K],
  ) => setSpec((current) => ({ ...current, [key]: value }));

  const selectStyle = (styleName: string) => {
    const preset = allStyles.find((style) => style.name === styleName);
    if (!preset) return;
    setSpec((current) => ({
      ...current,
      style: preset.name,
      stylePrompt: preset.prompt,
      negativePrompt: [commonNegativePrompt, preset.negativePrompt]
        .filter(Boolean)
        .join(", "),
    }));
  };

  const saveCustomStyleToWorkspace = (style: StylePreset) => {
    setCustomStyles((current) => [style, ...current]);
    setSpec((current) => ({
      ...current,
      style: style.name,
      stylePrompt: style.prompt,
      negativePrompt: [commonNegativePrompt, style.negativePrompt]
        .filter(Boolean)
        .join(", "),
    }));
    setCustomStyleOpen(false);
    setModal(null);
    notify(`已保存并选中自定义风格「${style.name}」`);
  };

  const saveStudioStyleToWorkspace = (style: StylePreset) => {
    setCustomStyles((current) => [
      style,
      ...current.filter((item) => item.id !== style.id),
    ]);
    setSpec((current) => ({
      ...current,
      style: style.name,
      stylePrompt: style.prompt,
      negativePrompt: [commonNegativePrompt, style.negativePrompt]
        .filter(Boolean)
        .join(", "),
    }));
  };

  const deleteCustomStyle = async (style: StylePreset) => {
    if (!style.custom || !window.confirm(`删除自定义风格「${style.name}」？`))
      return;
    try {
      const response = await fetch(`/api/styles/${style.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "删除风格失败");
      setCustomStyles((current) =>
        current.filter((item) => item.id !== style.id),
      );
      if (spec.style === style.name) selectStyle(stylePresets[0].name);
      notify(`已删除「${style.name}」`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "删除风格失败");
    }
  };

  const selectStyleCard = (
    event: MouseEvent<HTMLButtonElement>,
    styleName: string,
  ) => {
    const scroller = event.currentTarget.closest(".style-list");
    const scrollTop = scroller?.scrollTop ?? 0;
    selectStyle(styleName);
    window.requestAnimationFrame(() => {
      if (scroller) scroller.scrollTop = scrollTop;
    });
  };

  const importManifestFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(md|markdown|txt|json)$/i.test(file.name)) {
      notify("素材清单支持 MD、TXT 和 JSON 文档");
      return;
    }
    if (file.size > 500_000) {
      notify("素材清单不能超过 500 KB");
      return;
    }
    try {
      if (manifestRun?.id) await persistManifestWorkspace();
      const text = await file.text();
      setManifestSourceText(text);
      setManifestSourceName(file.name);
      setManifestRun(null);
      setSelectedManifestTaskId(null);
      setSelectedManifestTaskIds([]);
      notify(`已读取 ${file.name}`);
    } catch {
      notify("无法读取这份素材清单");
    }
  };

  const importManifestStyleFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(md|markdown|txt)$/i.test(file.name)) {
      notify("风格文档支持 MD 和 TXT 文件");
      return;
    }
    if (file.size > 50_000) {
      notify("风格文档不能超过 50 KB");
      return;
    }
    try {
      setManifestCustomStyleText((await file.text()).slice(0, 50_000));
      setManifestCustomStyleName(file.name);
      setManifestStyleMode("custom");
      notify(`已载入风格文档 ${file.name}`);
    } catch {
      notify("无法读取这份风格文档");
    }
  };

  const compileManifestStyleReference = async (
    reference = manifestStyleReference,
  ) => {
    if (!reference || manifestStyleCompiling) return;
    setManifestStyleCompiling(true);
    try {
      const response = await fetch("/api/styles/compile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: manifestCustomStyleName.replace(/\.(md|markdown|txt)$/i, ""),
          description:
            "请只根据参考图提取可复用的 2D 游戏 UI 视觉风格，包括配色、材质、线条、光源、装饰密度、边框和形状语言，不要复述具体角色、文字、Logo 或物体内容，也不要合并其他文字需求。",
          reference,
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Codex 无法提取参考图风格");
      setManifestStyleMode("custom");
      setManifestStyleReference(reference);
      setManifestCustomStyleName(
        (current) => current || payload.name || reference.name,
      );
      setManifestReferenceStylePrompt(payload.prompt || "");
      setManifestCustomStyleNegativePrompt(payload.negativePrompt || "");
      notify(
        `已从 ${reference.name} 提取图片风格，默认追加到原始描述后`,
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "参考图风格提取失败");
    } finally {
      setManifestStyleCompiling(false);
    }
  };

  const uploadManifestStyleReference = async (file?: File) => {
    if (!file || manifestStyleImageUploading) return;
    if (!/\.(png|jpe?g|webp)$/i.test(file.name)) {
      notify("风格参考图支持 PNG、JPG 和 WebP");
      return;
    }
    setManifestStyleImageUploading(true);
    try {
      const response = await fetch("/api/references", {
        method: "POST",
        headers: { "x-file-name": encodeURIComponent(file.name) },
        body: file,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "参考图上传失败");
      setManifestStyleMode("custom");
      await compileManifestStyleReference(payload);
    } catch (error) {
      notify(error instanceof Error ? error.message : "参考图上传失败");
    } finally {
      setManifestStyleImageUploading(false);
    }
  };

  const uploadManifestBatchReference = async (file?: File) => {
    if (!file || manifestBatchReferenceUploading) return;
    if (!/\.(png|jpe?g|webp)$/i.test(file.name)) {
      notify("批次参考图支持 PNG、JPG 和 WebP");
      return;
    }
    setManifestBatchReferenceUploading(true);
    try {
      const response = await fetch("/api/references", {
        method: "POST",
        headers: { "x-file-name": encodeURIComponent(file.name) },
        body: file,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "参考图上传失败");
      setManifestStyleReference(payload);
      setManifestBatchReferenceInfo({
        width: payload.width,
        height: payload.height,
        bytes: payload.bytes || file.size,
      });
      setManifestAttachStyleReference(true);
      notify(`已选择批次参考图 ${file.name}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "参考图上传失败");
    } finally {
      setManifestBatchReferenceUploading(false);
    }
  };

  const currentManifestWorkspaceState = () => ({
    projectName: manifestProjectName,
    engine: manifestEngine,
    outputRoot: manifestOutputRoot,
    styleMode: manifestStyleMode,
    styleId: manifestStyleId,
    customStyleName: manifestCustomStyleName,
    customStyleText: manifestCustomStyleText,
    customStyleNegativePrompt: manifestCustomStyleNegativePrompt,
    referenceStylePrompt: manifestReferenceStylePrompt,
    styleMergeMode: manifestStyleMergeMode,
    styleReference: manifestBatchReferenceForSubmission,
    attachStyleReference: manifestAttachStyleReference,
    maxTasks: manifestMaxTasks,
    batchSize: manifestBatchSize,
    concurrency: manifestConcurrency,
    search: manifestSearch,
    priority: manifestPriority,
    status: manifestStatus,
    selectedTaskId: selectedManifestTaskId || "",
    selectedTaskIds: selectedManifestTaskIds,
    sourceCollapsed: manifestSourceCollapsed,
  });

  const persistManifestWorkspace = async (
    run = manifestRun,
    includeManifest = false,
  ) => {
    if (!run?.id) return;
    const response = await fetch(`/api/asset-manifests/${run.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...(includeManifest && run.manifest ? { manifest: run.manifest } : {}),
        workspaceState: currentManifestWorkspaceState(),
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "保存任务现场失败");
    }
    return response.json() as Promise<AssetManifestRun>;
  };

  const applyManifestWorkspace = (payload: AssetManifestRun) => {
    const workspace = payload.workspaceState;
    const config = payload.config;
    const tasks = payload.manifest?.tasks ?? [];
    const requestedTaskId =
      workspace?.selectedTaskId &&
      tasks.some((task) => task.taskId === workspace.selectedTaskId)
        ? workspace.selectedTaskId
        : tasks[0]?.taskId || null;
    const preset =
      allStyles.find((style) => style.id === workspace?.styleId) ||
      allStyles.find((style) => style.name === config?.styleName);
    const restoredStyleMode =
      workspace?.styleMode || (config?.styleName && !preset ? "custom" : "preset");

    setManifestRun(payload);
    setManifestSourceText(payload.sourceText || "");
    setManifestSourceName(payload.sourceName || "");
    setManifestProjectName(
      workspace?.projectName ||
        config?.projectName ||
        payload.manifest?.project.name ||
        "",
    );
    setManifestEngine(
      workspace?.engine || config?.engine || payload.manifest?.project.engine || "Godot 4",
    );
    setManifestOutputRoot(
      workspace?.outputRoot ||
        config?.outputRoot ||
        payload.manifest?.project.outputRoot ||
        "assets/art/ui/",
    );
    setManifestMaxTasks(workspace?.maxTasks || config?.maxTasks || 200);
    setManifestBatchSize(workspace?.batchSize || 5);
    setManifestConcurrency(workspace?.concurrency || 2);
    setManifestStyleMode(restoredStyleMode);
    setManifestStyleId(preset?.id || workspace?.styleId || allStyles[0]?.id || "");
    setManifestCustomStyleName(
      workspace?.customStyleName ||
        (restoredStyleMode === "custom" ? config?.styleName || "" : ""),
    );
    setManifestCustomStyleText(
      workspace?.customStyleText ||
        (restoredStyleMode === "custom" ? config?.stylePrompt || "" : ""),
    );
    setManifestCustomStyleNegativePrompt(
      workspace?.customStyleNegativePrompt ||
        (restoredStyleMode === "custom" ? config?.negativePrompt || "" : ""),
    );
    setManifestReferenceStylePrompt(workspace?.referenceStylePrompt || "");
    setManifestStyleMergeMode(workspace?.styleMergeMode || "append");
    setManifestStyleReference(workspace?.styleReference);
    setManifestAttachStyleReference(Boolean(workspace?.attachStyleReference));
    setManifestSearch(workspace?.search || "");
    setManifestPriority(workspace?.priority || "全部");
    setManifestStatus(workspace?.status || "全部");
    setManifestSourceCollapsed(Boolean(workspace?.sourceCollapsed));
    setSelectedManifestTaskId(requestedTaskId);
    setSelectedManifestTaskIds(
      (workspace?.selectedTaskIds || []).filter((id) =>
        tasks.some((task) => task.taskId === id),
      ),
    );
    setManifestPreviewUrl(null);
  };

  const loadManifestRun = async (id: string) => {
    try {
      if (manifestRun?.id && manifestRun.id !== id) {
        await persistManifestWorkspace();
      }
      const response = await fetch(`/api/asset-manifests/${id}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "读取清单任务失败");
      applyManifestWorkspace(payload);
      notify(`已切换到「${payload.projectName || payload.sourceName}」`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "读取清单任务失败");
    }
  };

  const startNewManifestWorkspace = async () => {
    try {
      if (manifestRun?.id) await persistManifestWorkspace();
      setManifestRun(null);
      setManifestSourceText("");
      setManifestSourceName("");
      setManifestProjectName("");
      setManifestMaxTasks(manifestDefaultTaskLimit);
      setManifestStyleReference(undefined);
      setManifestAttachStyleReference(false);
      setManifestBatchReferenceInfo({});
      setManifestReferenceStylePrompt("");
      setManifestStyleMergeMode("append");
      setManifestCustomStyleNegativePrompt("");
      setManifestSearch("");
      setManifestPriority("全部");
      setManifestStatus("全部");
      setSelectedManifestTaskId(null);
      setSelectedManifestTaskIds([]);
      setManifestSourceCollapsed(false);
      setManifestPreviewUrl(null);
      notify("已创建空白清单项目，可导入另一个游戏的 MD");
    } catch (error) {
      notify(error instanceof Error ? error.message : "保存当前任务现场失败");
    }
  };

  useEffect(() => {
    if (!manifestRun?.id || !manifestRun.manifest) return;
    const timer = window.setTimeout(() => {
      void persistManifestWorkspace().catch(() => {});
    }, 700);
    return () => window.clearTimeout(timer);
  }, [
    manifestRun?.id,
    manifestProjectName,
    manifestEngine,
    manifestOutputRoot,
    manifestStyleMode,
    manifestStyleId,
    manifestCustomStyleName,
    manifestCustomStyleText,
    manifestCustomStyleNegativePrompt,
    manifestReferenceStylePrompt,
    manifestStyleMergeMode,
    manifestStyleReference,
    manifestAttachStyleReference,
    manifestMaxTasks,
    manifestBatchSize,
    manifestConcurrency,
    manifestSearch,
    manifestPriority,
    manifestStatus,
    selectedManifestTaskId,
    selectedManifestTaskIds,
    manifestSourceCollapsed,
  ]);

  const pollManifestRun = async (id: string) => {
    for (let index = 0; index < 245; index += 1) {
      const response = await fetch(`/api/asset-manifests/${id}`);
      const payload: AssetManifestRun & { error?: string } =
        await response.json();
      if (!response.ok)
        throw new Error(payload.error || "读取清单分析进度失败");
      setManifestRun(payload);
      if (payload.status === "completed") {
        applyManifestWorkspace(payload);
        await refreshManifestRuns();
        return payload;
      }
      if (["failed", "interrupted"].includes(payload.status)) {
        throw new Error(payload.error || "清单分析失败");
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
    }
    throw new Error("清单分析仍在运行，可稍后从最近记录继续查看");
  };

  const analyzeAssetManifest = async () => {
    if (!manifestSourceText.trim()) {
      notify("请先导入 MD 文档或粘贴素材清单");
      return;
    }
    if (!manifestStyle || manifestAnalyzing) return;
    if (
      manifestStyleMode === "custom" &&
      !manifestEffectiveCustomStylePrompt.trim()
    ) {
      notify("请上传风格 MD，或直接填写风格描述词");
      return;
    }
    setManifestAnalyzing(true);
    setManifestRun(null);
    setSelectedManifestTaskId(null);
    setSelectedManifestTaskIds([]);
    try {
      const response = await fetch("/api/asset-manifests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceText: manifestSourceText,
          sourceName: manifestSourceName || "asset_manifest.md",
          projectName: manifestProjectName,
          engine: manifestEngine,
          outputRoot: manifestOutputRoot,
          styleName:
            manifestStyleMode === "custom"
              ? manifestCustomStyleName || "自定义风格文档"
              : manifestStyle.name,
          stylePrompt:
            manifestStyleMode === "custom"
              ? manifestEffectiveCustomStylePrompt
              : manifestStyle.prompt,
          negativePrompt: [
            commonNegativePrompt,
            manifestStyleMode === "preset"
              ? manifestStyle.negativePrompt
              : manifestCustomStyleNegativePrompt,
          ]
            .filter(Boolean)
            .join(", "),
          maxTasks: manifestMaxTasks,
          batchSize: manifestBatchSize,
          concurrency: manifestConcurrency,
          styleMode: manifestStyleMode,
          styleId: manifestStyleId,
          customStyleName: manifestCustomStyleName,
          customStyleText: manifestCustomStyleText,
          customStyleNegativePrompt: manifestCustomStyleNegativePrompt,
          referenceStylePrompt: manifestReferenceStylePrompt,
          styleMergeMode: manifestStyleMergeMode,
          styleReference: manifestBatchReferenceForSubmission,
          attachStyleReference: manifestAttachStyleReference,
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "无法创建清单分析任务");
      setManifestRun(payload);
      const completed = await pollManifestRun(payload.id);
      notify(
        completed.manifest?.limitWarning ||
          `已生成 ${completed.manifest?.taskCount ?? 0} 条标准素材任务`,
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "清单分析失败");
    } finally {
      setManifestAnalyzing(false);
    }
  };

  const retryAssetManifestAnalysis = async () => {
    if (
      !manifestRun?.id ||
      !["failed", "interrupted"].includes(manifestRun.status) ||
      manifestAnalyzing
    ) {
      return;
    }
    setManifestAnalyzing(true);
    try {
      const response = await fetch(
        `/api/asset-manifests/${manifestRun.id}/retry`,
        { method: "POST" },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "无法重试清单分析");
      setManifestRun(payload);
      const completed = await pollManifestRun(payload.id);
      notify(
        completed.manifest?.limitWarning ||
          `重试完成，已生成 ${completed.manifest?.taskCount ?? 0} 条任务`,
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "清单重试失败");
    } finally {
      setManifestAnalyzing(false);
    }
  };

  const expandAssetManifestAnalysis = async () => {
    if (!manifestRun?.id || manifestAnalyzing) {
      return;
    }
    if (
      !manifestRun.manifest ||
      manifestRun.manifest.limitWarningType !== "section"
    ) {
      notify("这份清单没有需要继续展开的密集章节");
      return;
    }
    if (
      manifestRun.status === "queued" ||
      manifestRun.status === "running"
    ) {
      notify("清单当前正在处理中，请稍候");
      return;
    }
    setManifestAnalyzing(true);
    try {
      const response = await fetch(
        `/api/asset-manifests/${manifestRun.id}/expand`,
        { method: "POST" },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "无法继续展开密集章节");
      setManifestRun(payload);
      const completed = await pollManifestRun(payload.id);
      notify(
        completed.manifest?.limitWarning ||
          `章节已全部展开，共生成 ${completed.manifest?.taskCount ?? 0} 条任务`,
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "继续展开失败");
    } finally {
      setManifestAnalyzing(false);
    }
  };

  const patchManifestTask = (
    taskId: string,
    patch: Partial<AssetTask>,
  ) => {
    setManifestRun((current) => {
      if (!current?.manifest) return current;
      return {
        ...current,
        manifest: {
          ...current.manifest,
          tasks: current.manifest.tasks.map((task) =>
            task.taskId === taskId ? { ...task, ...patch } : task,
          ),
        },
      };
    });
  };

  const saveAssetManifest = async () => {
    if (!manifestRun?.manifest || manifestSaving) return;
    setManifestSaving(true);
    try {
      const response = await fetch(`/api/asset-manifests/${manifestRun.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          manifest: manifestRun.manifest,
          workspaceState: currentManifestWorkspaceState(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "保存清单失败");
      setManifestRun(payload);
      notify("标准素材任务已保存");
      await refreshManifestRuns();
    } catch (error) {
      notify(error instanceof Error ? error.message : "保存清单失败");
    } finally {
      setManifestSaving(false);
    }
  };

  const toggleManifestTaskSelection = (taskId: string) => {
    setSelectedManifestTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId],
    );
  };

  const runManifestTasks = async (taskIds: string[]) => {
    if (!manifestRun?.manifest || !taskIds.length || manifestQueueing) return;
    setManifestQueueing(true);
    try {
      const saveResponse = await fetch(
        `/api/asset-manifests/${manifestRun.id}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            manifest: manifestRun.manifest,
            workspaceState: currentManifestWorkspaceState(),
          }),
        },
      );
      const saved = await saveResponse.json();
      if (!saveResponse.ok)
        throw new Error(saved.error || "保存任务修改失败");
      setManifestRun(saved);
      const response = await fetch(
        `/api/asset-manifests/${manifestRun.id}/tasks/generate`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            taskIds,
            batchSize: manifestBatchSize,
            concurrency: manifestConcurrency,
            attachStyleReference:
              manifestAttachStyleReference &&
              Boolean(manifestBatchReferenceForSubmission),
            styleReference: manifestBatchReferenceForSubmission,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "无法加入素材生成队列");
      setManifestRun(payload.run);
      setSelectedManifestTaskIds([]);
      const requested = Number(payload.requestedCount) || taskIds.length;
      const accepted = Number(payload.acceptedCount) || 0;
      const skipped = Number(payload.skippedCount) || 0;
      const batches = Number(payload.batchCount) || payload.jobs?.length || 0;
      notify(
        `请求 ${requested} 条 · 已入队 ${accepted} 条 · ${batches} 个 Codex 批次${skipped ? ` · 跳过 ${skipped} 条` : ""}`,
      );
      await refreshJobs();
    } catch (error) {
      notify(error instanceof Error ? error.message : "批量生成失败");
    } finally {
      setManifestQueueing(false);
    }
  };

  const approveManifestTask = async (
    task: AssetTask,
    selectedOutputUrl = task.selectedOutputUrl || task.outputUrls[0],
  ) => {
    if (!manifestRun || !selectedOutputUrl) return;
    try {
      const response = await fetch(
        `/api/asset-manifests/${manifestRun.id}/tasks/${encodeURIComponent(task.taskId)}/review`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            status: "APPROVED",
            selectedOutputUrl,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "确认结果失败");
      setManifestRun(payload);
      const approvedTask = payload.manifest?.tasks?.find(
        (item: AssetTask) => item.taskId === task.taskId,
      );
      notify(
        approvedTask?.adoptedFiles?.length > 1
          ? `已采用并归档 ${approvedTask.adoptedFiles.length} 个套件文件`
          : approvedTask?.adoptedRelativePath
          ? `已采用并归档：${approvedTask.adoptedRelativePath}`
          : `已采用「${task.displayName}」的选中结果`,
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "确认结果失败");
    }
  };

  const approveSelectedManifestTasks = async () => {
    if (!manifestRun || !selectedReviewTasks.length || manifestApproving)
      return;
    const tasksToApprove = [...selectedReviewTasks];
    const approvedIds: string[] = [];
    const failedTasks: string[] = [];
    setManifestApproving(true);
    setManifestApproveProgress({
      completed: 0,
      total: tasksToApprove.length,
    });
    try {
      for (let index = 0; index < tasksToApprove.length; index += 1) {
        const task = tasksToApprove[index];
        const selectedOutputUrl =
          task.selectedOutputUrl || task.outputUrls[0];
        try {
          const response = await fetch(
            `/api/asset-manifests/${manifestRun.id}/tasks/${encodeURIComponent(task.taskId)}/review`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                status: "APPROVED",
                selectedOutputUrl,
              }),
            },
          );
          const payload = await response.json();
          if (!response.ok)
            throw new Error(payload.error || "确认结果失败");
          setManifestRun(payload);
          approvedIds.push(task.taskId);
        } catch {
          failedTasks.push(task.displayName);
        } finally {
          setManifestApproveProgress({
            completed: index + 1,
            total: tasksToApprove.length,
          });
        }
      }
      setSelectedManifestTaskIds((current) =>
        current.filter((id) => !approvedIds.includes(id)),
      );
      notify(
        failedTasks.length
          ? `已采用 ${approvedIds.length} 条，${failedTasks.length} 条失败并保留勾选`
          : `已采用并归档 ${approvedIds.length} 条素材`,
      );
      await refreshManifestRuns();
    } finally {
      setManifestApproving(false);
    }
  };

  const revealOutputDirectory = async (
    scope: "all" | "manifest" | "accepted",
  ) => {
    try {
      const response = await fetch("/api/reveal-output", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scope,
          ...(scope !== "all" && manifestRun
            ? { manifestId: manifestRun.id }
            : {}),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "无法打开本地目录");
      notify(
        scope === "all"
          ? "已打开全部生成结果目录"
          : scope === "accepted"
            ? "已打开正式采用素材目录"
            : "已打开当前任务存档目录",
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "无法打开本地目录");
    }
  };

  const loadManifestTaskIntoCreator = (task: AssetTask) => {
    const match = task.size.match(/(\d+)\s*[×x]\s*(\d+)/i);
    const width = Number(match?.[1]) || 1024;
    const height = Number(match?.[2]) || 1024;
    const creatorSize =
      width / Math.max(height, 1) >= 1.6
        ? "512 × 256"
        : Math.max(width, height) > 1536
          ? "2048 × 2048"
          : Math.max(width, height) > 1024
            ? "1536 × 1024"
            : "1024 × 1024";
    const project = manifestRun?.manifest?.project;
    setSpec({
      ...initialSpec,
      prompt: task.prompt,
      kind: task.kind,
      gameGenre: /武侠|仙侠|修仙/.test(project?.artDirection || "")
        ? "武侠仙侠"
        : "通用游戏",
      useCase: task.useCase,
      states: task.states.slice(0, 8),
      elements: task.elements.slice(0, 10),
      engine: project?.engine?.startsWith("Godot")
        ? "Godot 4"
        : engineOptions.includes(project?.engine || "")
          ? project!.engine
          : "Godot 4",
      style: task.styleName,
      stylePrompt: task.stylePrompt,
      negativePrompt: task.negativePrompt || commonNegativePrompt,
      size: creatorSize,
      variants: task.variants,
      transparent: task.transparent,
      styleLock: true,
      taskMeta: {
        manifestId: manifestRun?.id || "",
        taskId: task.taskId,
        assetId: task.assetId,
        fileName: task.fileName,
        runtimePath: task.runtimePath,
      },
    });
    setShowCompiledPrompt(true);
    go("creator");
    notify(`已把「${task.displayName}」载入创作台`);
  };

  const toggleSpecList = (key: "states" | "elements", value: string) => {
    setSpec((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  };

  const enrichSpec = async () => {
    if (!spec.prompt.trim()) {
      notify("先用一句话描述你要做的界面");
      return;
    }
    if (isEnriching) return;
    setIsEnriching(true);
    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(spec),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Codex 规格补全失败");
      setSpec((current) => ({
        ...current,
        prompt: payload.refinedPrompt || current.prompt,
        kind: payload.kind || current.kind,
        gameGenre: payload.gameGenre || current.gameGenre,
        useCase: payload.useCase || current.useCase,
        states: Array.isArray(payload.states) ? payload.states : current.states,
        elements: Array.isArray(payload.elements)
          ? payload.elements
          : current.elements,
        engine: payload.engine || current.engine,
        size: payload.size || current.size,
        transparent:
          typeof payload.transparent === "boolean"
            ? payload.transparent
            : current.transparent,
      }));
      setShowCompiledPrompt(true);
      notify("Codex 已把一句话需求补成可执行规格");
    } catch (error) {
      notify(error instanceof Error ? error.message : "规格补全失败");
    } finally {
      setIsEnriching(false);
    }
  };

  const uploadReference = async (file?: File) => {
    if (!file || isUploadingReference) return;
    setIsUploadingReference(true);
    try {
      const response = await fetch("/api/references", {
        method: "POST",
        headers: { "x-file-name": encodeURIComponent(file.name) },
        body: file,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "参考图上传失败");
      updateSpec("reference", payload);
      notify(`已把 ${file.name} 设为生成参考`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "参考图上传失败");
    } finally {
      setIsUploadingReference(false);
    }
  };

  const useLibraryReference = (file: ResourceFile) => {
    setSpec((current) => ({
      ...current,
      reference: {
        name: file.name,
        path: `library/imports/${file.relativePath}`,
        url: file.url,
        source: "library",
      },
    }));
    setBrowsingResource(null);
    setResourceFiles([]);
    setPage("creator");
    notify(`已把 ${file.name} 设为生成参考`);
  };

  const openJobLog = async (jobId: string) => {
    setLoadingJobLog(jobId);
    try {
      const response = await fetch(`/api/jobs/${jobId}/log`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "读取任务日志失败");
      setJobLog(payload);
    } catch (error) {
      notify(error instanceof Error ? error.message : "读取任务日志失败");
    } finally {
      setLoadingJobLog(null);
    }
  };

  const retryJob = (job: GenerationJob) => {
    setSpec({ ...initialSpec, ...job.spec });
    setShowCompiledPrompt(true);
    setPage("creator");
    notify("失败任务的规格已载入，确认后可以重新生成");
  };

  const importOpenResource = async (id: string) => {
    if (importingResource) return;
    setImportingResource(id);
    try {
      const response = await fetch(`/api/resources/${id}/import`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "素材导入失败");
      await refreshResources();
      notify(`已导入 ${payload.fileCount} 个文件到 ${payload.path}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "素材导入失败");
    } finally {
      setImportingResource(null);
    }
  };

  const browseOpenResource = async (id: string) => {
    try {
      const response = await fetch(`/api/resources/${id}/files?limit=120`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "读取素材文件失败");
      setBrowsingResource(id);
      setResourceFiles(payload.files);
    } catch (error) {
      notify(error instanceof Error ? error.message : "读取素材文件失败");
    }
  };

  const pollJob = async (jobId: string, placeholderIds: string[]) => {
    for (;;) {
      await new Promise((resolve) => window.setTimeout(resolve, 1100));
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) throw new Error("读取任务状态失败");
      const job: GenerationJob = await response.json();
      setProgress(job.progress);
      setJobs((current) => [
        job,
        ...current.filter((item) => item.id !== job.id),
      ]);
      if (job.status === "completed") {
        const outputAssets = assetsFromJob(job);
        setAssets((current) => [
          ...outputAssets,
          ...current.filter((asset) => !placeholderIds.includes(asset.id)),
        ]);
        if (outputAssets[0]) setSelectedId(outputAssets[0].id);
        notify(`Codex 已生成 ${outputAssets.length} 个素材`);
        break;
      }
      if (["failed", "interrupted"].includes(job.status)) {
        setAssets((current) =>
          current.map((asset) =>
            placeholderIds.includes(asset.id)
              ? { ...asset, status: "failed" }
              : asset,
          ),
        );
        notify(
          job.error
            ? `生成失败：${job.error.slice(-80)}`
            : "Codex 生成失败，请到生成记录查看",
        );
        break;
      }
    }
  };

  const runGeneration = async () => {
    if (isGenerating) return;
    if (!spec.prompt.trim()) {
      notify("请先描述你想生成的界面素材");
      return;
    }
    setIsGenerating(true);
    setProgress(2);
    setPage("creator");
    setFilter("全部");
    let placeholderIds: string[] = [];
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spec }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "本地生成服务不可用");
      const job = payload as GenerationJob;
      const placeholders: GeneratedAsset[] = Array.from(
        { length: spec.variants },
        (_, index) => ({
          id: `pending-${job.id}-${index}`,
          jobId: job.id,
          name: `${spec.kind} · 生成中 ${index + 1}`,
          kind: spec.kind,
          style: spec.style,
          status: "generating",
          score: 0,
          palette: paletteForStyle(spec.style, index),
          variant: index + 1,
        }),
      );
      placeholderIds = placeholders.map((asset) => asset.id);
      setAssets((current) => [...placeholders, ...current]);
      setSelectedId(placeholders[0].id);
      setJobs((current) => [job, ...current]);
      await pollJob(job.id, placeholderIds);
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败";
      notify(message);
      if (placeholderIds.length)
        setAssets((current) =>
          current.filter((asset) => !placeholderIds.includes(asset.id)),
        );
    } finally {
      setIsGenerating(false);
      setProgress(0);
      void refreshJobs();
    }
  };

  const analyzeSplitItem = async (
    localId: string,
    file: File,
    mode: "auto" | "frames" | "layout" | "table",
    gridRows: number,
    gridColumns: number,
  ) => {
    setSplitItems((current) =>
      current.map((item) =>
        item.localId === localId
          ? {
              ...item,
              status: "analyzing",
              session: null,
              exportResult: null,
              error: undefined,
            }
          : item,
      ),
    );
    try {
      const query = new URLSearchParams({ mode });
      if (mode === "table") {
        query.set("rows", String(gridRows));
        query.set("columns", String(gridColumns));
      }
      const response = await fetch(`/api/sheets/analyze?${query}`, {
        method: "POST",
        headers: { "x-file-name": encodeURIComponent(file.name) },
        body: file,
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "图片区域检测失败");
      setSplitItems((current) =>
        current.map((item) =>
          item.localId === localId
            ? { ...item, status: "ready", session: payload, error: undefined }
            : item,
        ),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "拆图分析失败";
      setSplitItems((current) =>
        current.map((item) =>
          item.localId === localId
            ? { ...item, status: "failed", error: message }
            : item,
        ),
      );
      return false;
    }
  };

  const importSplitFiles = async (files: File[]) => {
    if (!files.length) return;
    if (splitItems.some((item) => ["queued", "analyzing"].includes(item.status))) {
      notify("当前批次仍在检测，请稍后再添加");
      return;
    }
    const accepted = files
      .filter((file) => /\.(png|jpe?g|webp)$/i.test(file.name))
      .slice(0, 20);
    if (!accepted.length) {
      notify("请选择 PNG、JPG 或 WebP 图片");
      return;
    }
    const nextItems: SplitQueueItem[] = accepted.map((file) => ({
      localId: crypto.randomUUID(),
      file,
      status: "queued",
      session: null,
      exportResult: null,
      frameMode: "keep",
    }));
    setSplitItems((current) => [...current, ...nextItems]);
    setActiveSplitId(nextItems[0].localId);
    const mode = splitMode;
    const rows = splitGridRows;
    const columns = splitGridColumns;
    let completed = 0;
    for (const item of nextItems) {
      if (
        await analyzeSplitItem(
          item.localId,
          item.file,
          mode,
          rows,
          columns,
        )
      )
        completed += 1;
    }
    notify(
      completed === nextItems.length
        ? `已完成 ${completed} 张图片的区域检测`
        : `已完成 ${completed}/${nextItems.length} 张，失败项可单独重试`,
    );
  };

  const reanalyzeActiveSheet = async () => {
    if (!activeSplitItem || splitExportingId) return;
    const ok = await analyzeSplitItem(
      activeSplitItem.localId,
      activeSplitItem.file,
      splitMode,
      splitGridRows,
      splitGridColumns,
    );
    notify(ok ? "已重新检测当前图片" : "重新检测失败");
  };

  const removeSplitItem = (localId: string) => {
    const index = splitItems.findIndex((item) => item.localId === localId);
    const nextItems = splitItems.filter((item) => item.localId !== localId);
    setSplitItems(nextItems);
    if (activeSplitId === localId) {
      setActiveSplitId(
        nextItems[Math.min(Math.max(index, 0), nextItems.length - 1)]?.localId ??
          null,
      );
    }
  };

  const toggleSplitRegion = (id: number) => {
    if (!activeSplitItem) return;
    setSplitItems((current) =>
      current.map((item) =>
        item.localId === activeSplitItem.localId && item.session
          ? {
              ...item,
              exportResult: null,
              session: {
                ...item.session,
                regions: item.session.regions.map((region) =>
                  region.id === id
                    ? { ...region, active: !region.active }
                    : region,
                ),
              },
            }
          : item,
      ),
    );
  };

  const setAllSplitRegions = (active: boolean) => {
    if (!activeSplitItem) return;
    setSplitItems((current) =>
      current.map((item) =>
        item.localId === activeSplitItem.localId && item.session
          ? {
              ...item,
              exportResult: null,
              session: {
                ...item.session,
                regions: item.session.regions.map((region) => ({
                  ...region,
                  active,
                })),
              },
            }
          : item,
      ),
    );
  };

  const setActiveSplitFrameMode = (frameMode: "keep" | "remove") => {
    if (!activeSplitItem) return;
    setSplitItems((current) =>
      current.map((item) =>
        item.localId === activeSplitItem.localId
          ? { ...item, frameMode, exportResult: null }
          : item,
      ),
    );
  };

  const exportSheet = async () => {
    if (
      !activeSplitItem ||
      !splitSession ||
      activeSplitItem.status !== "ready" ||
      splitExportingId
    )
      return;
    const activeIds = splitSession.regions
      .filter((region) => region.active)
      .map((region) => region.id);
    if (!activeIds.length) {
      notify("至少选择一个要导出的区域");
      return;
    }
    setSplitExportingId(activeSplitItem.localId);
    try {
      const response = await fetch(
        `/api/sheets/${splitSession.id}/export`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            activeIds,
            frameMode: splitFrameMode,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "无损导出失败");
      setSplitItems((current) =>
        current.map((item) =>
          item.localId === activeSplitItem.localId
            ? { ...item, exportResult: payload }
            : item,
        ),
      );
      notify(`已无损导出 ${payload.exported} 个 PNG`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "无损导出失败");
    } finally {
      setSplitExportingId(null);
    }
  };

  const downloadJson = (name: string, payload: unknown) => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    notify(`已导出 ${name}`);
  };

  const exportManifestArchive = () => {
    if (!manifestRun?.manifest) return;
    downloadJson(
      `${manifestRun.manifest.project.name}-ui-forge-archive.json`,
      {
        archiveVersion: "ui-forge.archive/v1",
        exportedAt: new Date().toISOString(),
        run: manifestRun,
        generationJobs: jobs.filter(
          (job) => job.spec.taskMeta?.manifestId === manifestRun.id,
        ),
      },
    );
  };

  const exportSelected = () =>
    downloadJson(`ui-forge-${selected?.id ?? "manifest"}.json`, {
      version: 1,
      generator: "ui-forge",
      engine,
      scale: exportScale,
      spec,
      selected,
    });
  const go = (next: WorkspacePage) => {
    setPage(next);
    if (next === "history") void refreshJobs();
    if (next === "manifest") void refreshManifestRuns();
    if (next === "style-studio") void refreshStyleProjects();
  };
  const toggleAtlas = (id: string) =>
    setAtlasIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

  const ManifestPage = () => (
    <div className="manifest-page-shell">
      <section className="manifest-project-switcher panel-surface">
        <div className="manifest-project-switcher-title">
          <Archive size={17} />
          <span>
            <strong>清单项目存档</strong>
            <small>切换项目会恢复任务、进度、结果和上次使用的设置</small>
          </span>
        </div>
        <div className="manifest-project-list">
          {manifestRuns.length ? (
            manifestRuns.map((run) => (
              <button
                key={run.id}
                className={manifestRun?.id === run.id ? "active" : ""}
                onClick={() => void loadManifestRun(run.id)}
              >
                <span>
                  <strong>{run.projectName || run.sourceName}</strong>
                  <small>
                    {run.taskCount || 0} 条任务 · 已采用{" "}
                    {run.taskStatusCounts?.APPROVED || 0}
                    {run.limitWarningType === "total"
                      ? " · 已达总上限"
                      : run.limitWarningType === "section"
                        ? " · 章节待展开"
                        : ""}
                  </small>
                </span>
                <em>
                  {manifestRun?.id === run.id
                    ? "当前项目"
                    : run.status === "completed"
                      ? "切换"
                      : `${run.progress}%`}
                </em>
              </button>
            ))
          ) : (
            <small>还没有任务存档，导入第一份 MD 后会自动保存</small>
          )}
        </div>
        <button
          className="manifest-new-project"
          onClick={() => void startNewManifestWorkspace()}
        >
          <Plus size={15} />
          新建清单项目
        </button>
      </section>
      <div
        className={`manifest-workspace ${manifestSourceCollapsed ? "source-collapsed" : ""}`}
      >
      <aside className="manifest-import-pane panel-surface">
        <button
          className="manifest-collapse-button"
          aria-label={
            manifestSourceCollapsed ? "展开导入素材清单" : "收起导入素材清单"
          }
          title={
            manifestSourceCollapsed ? "展开导入素材清单" : "收起导入素材清单"
          }
          onClick={() => setManifestSourceCollapsed((current) => !current)}
        >
          {manifestSourceCollapsed ? (
            <ChevronRight size={17} />
          ) : (
            <ChevronLeft size={17} />
          )}
        </button>
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <FileText size={13} /> SOURCE MANIFEST
            </span>
            <h2>导入素材清单</h2>
          </div>
        </div>
        <input
          ref={manifestFileInputRef}
          className="split-hidden-input"
          type="file"
          accept=".md,.markdown,.txt,.json,text/markdown,text/plain,application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importManifestFile(file);
            event.currentTarget.value = "";
          }}
        />
        <button
          className="manifest-dropzone"
          type="button"
          onClick={() => manifestFileInputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void importManifestFile(event.dataTransfer.files?.[0]);
          }}
        >
          <FileText size={27} />
          <strong>
            {manifestSourceName || "选择或拖入 MD 素材清单"}
          </strong>
          <span>也可以直接在下方粘贴长文本</span>
        </button>
        <label className="manifest-field">
          <span>清单原文</span>
          <textarea
            value={manifestSourceText}
            placeholder="粘贴资产 ID、尺寸、状态、目录、命名、验收要求等内容…"
            onChange={(event) => {
              setManifestSourceText(event.target.value.slice(0, 500_000));
              if (!manifestSourceName) setManifestSourceName("pasted_manifest.md");
            }}
          />
          <small>{manifestSourceText.length.toLocaleString()} / 500,000 字符</small>
        </label>
        <div className="manifest-settings-grid">
          <label className="manifest-field full">
            <span>项目名称（可留空自动识别）</span>
            <input
              value={manifestProjectName}
              placeholder="例如：诸天铸道"
              onChange={(event) => setManifestProjectName(event.target.value)}
            />
          </label>
          <label className="manifest-field">
            <span>目标引擎</span>
            <select
              value={manifestEngine}
              onChange={(event) => setManifestEngine(event.target.value)}
            >
              {engineOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="manifest-field">
            <span>任务上限</span>
            <input
              type="number"
              min="20"
              max={manifestMaxTaskLimit}
              step="10"
              value={manifestMaxTasks}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                if (!Number.isFinite(value)) return;
                setManifestMaxTasks(
                  Math.max(20, Math.min(manifestMaxTaskLimit, value)),
                );
              }}
            />
            <small>
              默认 {manifestDefaultTaskLimit}，可设置 20～
              {manifestMaxTaskLimit}；达到上限时会明确提示
            </small>
          </label>
          <label className="manifest-field full">
            <span>Codex 每批处理数量</span>
            <select
              value={manifestBatchSize}
              onChange={(event) =>
                setManifestBatchSize(Number(event.target.value))
              }
            >
              <option value={1}>1 条 · 每条独立对话</option>
              <option value={4}>4 条 · 更稳妥</option>
              <option value={5}>5 条 · 推荐平衡</option>
              <option value={6}>6 条 · 更省上下文</option>
            </select>
            <small>只合并同风格、同类型任务；批内仍保留逐项进度和审核。</small>
          </label>
          <label className="manifest-field full">
            <span>同时运行的 Codex 批次</span>
            <select
              value={manifestConcurrency}
              onChange={(event) =>
                setManifestConcurrency(Number(event.target.value))
              }
            >
              <option value={1}>1 批 · 最稳定</option>
              <option value={2}>2 批 · 推荐</option>
              <option value={3}>3 批 · 更快，额度压力更高</option>
            </select>
            <small>
              每批都会启动独立 Codex CLI；超过这里的数量才会显示排队中。
            </small>
          </label>
          <label className="manifest-field full">
            <span>运行时素材根目录</span>
            <input
              value={manifestOutputRoot}
              onChange={(event) => setManifestOutputRoot(event.target.value)}
            />
          </label>
          <div className="manifest-style-source full">
            <span>统一视觉风格</span>
            <div className="manifest-style-mode">
              <button
                className={manifestStyleMode === "preset" ? "active" : ""}
                onClick={() => setManifestStyleMode("preset")}
              >
                <Palette size={13} />
                从风格库选择
              </button>
              <button
                className={manifestStyleMode === "custom" ? "active" : ""}
                onClick={() => setManifestStyleMode("custom")}
              >
                <FileText size={13} />
                上传或填写文档
              </button>
            </div>
            {manifestStyleMode === "preset" ? (
              <>
                <select
                  value={manifestStyleId}
                  onChange={(event) => setManifestStyleId(event.target.value)}
                >
                  {allStyles.map((style) => (
                    <option value={style.id} key={style.id}>
                      {style.name} · {style.note}
                    </option>
                  ))}
                </select>
                <small>{manifestStyle?.prompt}</small>
              </>
            ) : (
              <>
                <input
                  ref={manifestStyleFileInputRef}
                  className="split-hidden-input"
                  type="file"
                  accept=".md,.markdown,.txt,text/markdown,text/plain"
                  onChange={(event) => {
                    void importManifestStyleFile(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
                <input
                  ref={manifestStyleImageInputRef}
                  className="split-hidden-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    void uploadManifestStyleReference(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
                <div className="manifest-style-input-actions">
                  <button
                    className="manifest-style-upload"
                    onClick={() => manifestStyleFileInputRef.current?.click()}
                  >
                    <FileText size={14} />
                    {manifestCustomStyleName || "选择风格 MD / TXT"}
                  </button>
                  <button
                    className="manifest-style-upload"
                    disabled={
                      manifestStyleImageUploading || manifestStyleCompiling
                    }
                    onClick={() => manifestStyleImageInputRef.current?.click()}
                  >
                    {manifestStyleImageUploading ||
                    manifestStyleCompiling ? (
                      <LoaderCircle className="spin" size={14} />
                    ) : (
                      <Image size={14} />
                    )}
                    {manifestStyleCompiling
                      ? "Codex 正在提取"
                      : manifestStyleImageUploading
                        ? "正在上传"
                        : manifestStyleReference
                          ? "更换参考图"
                          : "添加参考图（可选）"}
                  </button>
                </div>
                {manifestStyleReference && (
                  <div className="manifest-style-reference-card">
                    <img
                      src={manifestStyleReference.url}
                      alt="风格参考图"
                    />
                    <div>
                      <strong>{manifestStyleReference.name}</strong>
                      <small>
                        {manifestStyleCompiling
                          ? "Codex 正在分析配色、材质、线条、光源和形状语言…"
                          : "默认用于一次性提取；也可在下方选择随批次附带"}
                      </small>
                    </div>
                    <div className="manifest-style-reference-actions">
                      <button
                        disabled={
                          manifestStyleImageUploading ||
                          manifestStyleCompiling
                        }
                        onClick={() => void compileManifestStyleReference()}
                      >
                        <RefreshCcw
                          className={manifestStyleCompiling ? "spin" : ""}
                          size={13}
                        />
                        重新提取
                      </button>
                      <button
                        disabled={
                          manifestStyleImageUploading ||
                          manifestStyleCompiling
                        }
                        onClick={() => {
                          setManifestStyleReference(undefined);
                          if (!manifestSavedStyleReference) {
                            setManifestAttachStyleReference(false);
                          }
                          notify("已移除参考图，提取出的文字风格仍然保留");
                        }}
                      >
                        <X size={13} />
                        移除图片
                      </button>
                    </div>
                  </div>
                )}
                <div className="manifest-style-layer">
                  <div className="manifest-style-layer-title">
                    <strong>1 · 原始风格要求</strong>
                    <small>始终保留，不会被参考图覆盖</small>
                  </div>
                  <textarea
                    value={manifestCustomStyleText}
                    placeholder="直接粘贴你的核心风格要求：题材、配色、材质、线条、光源、像素密度、需要避免的效果……"
                    onChange={(event) =>
                      setManifestCustomStyleText(
                        event.target.value.slice(0, 50_000),
                      )
                    }
                  />
                  <small>
                    {manifestCustomStyleText.length.toLocaleString()} / 50,000
                    字符
                  </small>
                </div>
                {(manifestReferenceStylePrompt ||
                  manifestStyleCompiling) && (
                  <div className="manifest-style-layer reference">
                    <div className="manifest-style-layer-title">
                      <strong>2 · 图片风格摘要</strong>
                      <small>Codex 一次性提取，可继续编辑</small>
                    </div>
                    <div className="manifest-style-merge-mode">
                      <button
                        className={
                          manifestStyleMergeMode === "append" ? "active" : ""
                        }
                        onClick={() => setManifestStyleMergeMode("append")}
                      >
                        <Plus size={12} />
                        追加到原风格（默认）
                      </button>
                      <button
                        className={
                          manifestStyleMergeMode === "replace" ? "active" : ""
                        }
                        onClick={() => setManifestStyleMergeMode("replace")}
                      >
                        <RefreshCcw size={12} />
                        仅使用图片风格
                      </button>
                    </div>
                    <textarea
                      value={manifestReferenceStylePrompt}
                      disabled={manifestStyleCompiling}
                      placeholder={
                        manifestStyleCompiling
                          ? "Codex 正在提取图片风格…"
                          : "图片风格摘要"
                      }
                      onChange={(event) =>
                        setManifestReferenceStylePrompt(
                          event.target.value.slice(0, 12_000),
                        )
                      }
                    />
                    <small>
                      {manifestStyleMergeMode === "append"
                        ? "生成任务时会保留第 1 段，并把本段追加到后面。"
                        : "生成任务时只使用本段；第 1 段仍会保存在项目里。"}
                    </small>
                  </div>
                )}
                {manifestReferenceStylePrompt && (
                  <details className="manifest-style-final-preview">
                    <summary>
                      <span>
                        <strong>3 · 最终风格提示词预览</strong>
                        <small>实际发送给素材任务的文字</small>
                      </span>
                      <em>
                        {manifestStyleMergeMode === "append"
                          ? "追加模式"
                          : "图片替换模式"}
                      </em>
                    </summary>
                    <pre>{manifestEffectiveCustomStylePrompt}</pre>
                  </details>
                )}
              </>
            )}
          </div>
          <div className="manifest-batch-reference full">
            <input
              ref={manifestBatchReferenceInputRef}
              className="split-hidden-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                void uploadManifestBatchReference(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <div className="manifest-batch-reference-title">
              <span>
                <strong>批次风格参考图</strong>
                <small>可选 · 每个新 Codex 对话只附带一次</small>
              </span>
              <label
                className={
                  manifestAttachStyleReference ? "enabled" : ""
                }
              >
                <input
                  type="checkbox"
                  checked={
                    manifestAttachStyleReference &&
                    Boolean(manifestBatchStyleReference)
                  }
                  disabled={!manifestBatchStyleReference}
                  onChange={(event) =>
                    setManifestAttachStyleReference(event.target.checked)
                  }
                />
                生成时附带
              </label>
            </div>
            {manifestBatchStyleReference ? (
              <div className="manifest-batch-reference-card">
                <img
                  src={manifestBatchStyleReference.url}
                  alt="批次风格参考图"
                />
                <span>
                  <strong>{manifestBatchStyleReference.name}</strong>
                  <small>
                    {manifestBatchReferenceInfo.width &&
                    manifestBatchReferenceInfo.height
                      ? `${manifestBatchReferenceInfo.width} × ${manifestBatchReferenceInfo.height} px`
                      : "分辨率读取中"}
                    {" · "}
                    {formatReferenceBytes(manifestBatchReferenceInfo.bytes)}
                  </small>
                  <em>
                    {manifestBatchReferenceIsSavedAnchor
                      ? "来自已保存风格的锚点图"
                      : "手动选择的静态资源"}
                  </em>
                </span>
                <button
                  disabled={manifestBatchReferenceUploading}
                  onClick={() =>
                    manifestBatchReferenceInputRef.current?.click()
                  }
                >
                  {manifestBatchReferenceUploading ? (
                    <LoaderCircle className="spin" size={13} />
                  ) : (
                    <RefreshCcw size={13} />
                  )}
                  更换
                </button>
                {manifestStyleReference &&
                manifestSavedStyleReference &&
                !manifestBatchReferenceIsSavedAnchor ? (
                  <button
                    onClick={() => {
                      setManifestStyleReference(undefined);
                      notify("已改用当前风格的验证样张");
                    }}
                  >
                    <Image size={13} />
                    使用风格样张
                  </button>
                ) : null}
                {manifestStyleReference &&
                !manifestBatchReferenceIsSavedAnchor ? (
                  <button
                    onClick={() => {
                      setManifestStyleReference(undefined);
                      setManifestAttachStyleReference(false);
                      notify(
                        manifestSavedStyleReference
                          ? "已移除手动参考图，可重新启用当前风格样张"
                          : "已移除批次参考图",
                      );
                    }}
                  >
                    <X size={13} />
                    移除
                  </button>
                ) : null}
                {manifestSavedStyleReferences.length > 1 ? (
                  <div className="manifest-saved-anchor-choices">
                    <small>选择已保存锚点</small>
                    <span>
                      {manifestSavedStyleReferences.map(
                        (reference, index) => (
                          <button
                            key={reference.url}
                            className={
                              manifestBatchStyleReference?.url ===
                              reference.url
                                ? "active"
                                : ""
                            }
                            title={`风格锚点 ${index + 1}`}
                            onClick={() => {
                              setManifestStyleReference(
                                index === 0 ? undefined : reference,
                              );
                              setManifestAttachStyleReference(true);
                            }}
                          >
                            <img
                              src={reference.url}
                              alt={`风格锚点 ${index + 1}`}
                            />
                            <b>{index + 1}</b>
                          </button>
                        ),
                      )}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                className="manifest-batch-reference-empty"
                disabled={manifestBatchReferenceUploading}
                onClick={() =>
                  manifestBatchReferenceInputRef.current?.click()
                }
              >
                {manifestBatchReferenceUploading ? (
                  <LoaderCircle className="spin" size={15} />
                ) : (
                  <ImagePlus size={15} />
                )}
                {manifestBatchReferenceUploading
                  ? "正在上传参考图…"
                  : "选择一张批次参考图"}
              </button>
            )}
            <p>
              图片不会拆成每条任务重复上传，而是每批 4～6
              条共用一次。图像上下文成本主要受分辨率影响，文件大小仅供参考；这里不限制图片尺寸或文件大小。
            </p>
          </div>
        </div>
        <button
          className="manifest-analyze-button"
          disabled={
            manifestAnalyzing ||
            manifestStyleImageUploading ||
            manifestStyleCompiling ||
            !manifestSourceText.trim() ||
            (manifestStyleMode === "custom" &&
              !manifestEffectiveCustomStylePrompt.trim()) ||
            !health?.codex?.authenticated
          }
          onClick={() => void analyzeAssetManifest()}
        >
          {manifestAnalyzing ? (
            <LoaderCircle className="spin" size={17} />
          ) : (
            <WandSparkles size={17} />
          )}
          <span>
            <strong>
              {manifestAnalyzing ? "Codex 正在拆分清单" : "分析并生成标准任务"}
            </strong>
            <small>读取结构、补规格、生成命名与风格提示词</small>
          </span>
        </button>
        {manifestRun &&
          ["queued", "running", "failed", "interrupted"].includes(
            manifestRun.status,
          ) && (
            <div className={`manifest-run-card ${manifestRun.status}`}>
              <div>
                {manifestRun.status === "failed" ? (
                  <CircleX size={16} />
                ) : (
                  <LoaderCircle
                    size={16}
                    className={manifestAnalyzing ? "spin" : ""}
                  />
                )}
                <strong>{manifestRun.stage}</strong>
              </div>
              <div className="job-progress">
                <i style={{ width: `${manifestRun.progress}%` }} />
              </div>
              {manifestRun.error && <small>{manifestRun.error}</small>}
              {["failed", "interrupted"].includes(manifestRun.status) && (
                <button
                  className="manifest-retry-button"
                  disabled={
                    manifestAnalyzing || !health?.codex?.authenticated
                  }
                  onClick={() => void retryAssetManifestAnalysis()}
                >
                  {manifestAnalyzing ? (
                    <LoaderCircle className="spin" size={13} />
                  ) : (
                    <RefreshCcw size={13} />
                  )}
                  复用成功段，只重试失败段
                </button>
              )}
            </div>
          )}
      </aside>

      <section className="manifest-task-pane panel-surface">
        {manifestRun?.manifest ? (
          <>
            <div className="manifest-summary">
              <div>
                <span className="eyebrow">STANDARD TASK MANIFEST</span>
                <h2>{manifestRun.manifest.project.name}</h2>
                <p>{manifestRun.manifest.project.summary}</p>
              </div>
              <div className="manifest-summary-count">
                <strong>{manifestRun.manifest.taskCount}</strong>
                <span>标准任务</span>
              </div>
            </div>
            {manifestRun.manifest.limitWarning && (
              <div className="manifest-limit-warning" role="alert">
                <TriangleAlert size={17} />
                <span>
                  <strong>
                    {manifestRun.manifest.limitWarningType === "total"
                      ? "任务数量已触及总上限"
                      : "部分章节可能未完全展开"}
                  </strong>
                  <small>{manifestRun.manifest.limitWarning}</small>
                  {manifestRun.manifest.limitWarningType === "section" && (
                    <button
                      className="manifest-limit-expand"
                      disabled={
                        manifestAnalyzing || !health?.codex?.authenticated
                      }
                      onClick={() => void expandAssetManifestAnalysis()}
                    >
                      {manifestAnalyzing ? (
                        <LoaderCircle className="spin" size={13} />
                      ) : (
                        <RefreshCcw size={13} />
                      )}
                      自动继续展开密集章节
                    </button>
                  )}
                </span>
              </div>
            )}
            <div className="manifest-stats">
              {(["P0", "P1", "P2"] as const).map((priority) => (
                <button
                  key={priority}
                  className={manifestPriority === priority ? "active" : ""}
                  onClick={() =>
                    setManifestPriority(
                      manifestPriority === priority ? "全部" : priority,
                    )
                  }
                >
                  <b>{priority}</b>
                  <span>
                    {manifestRun.manifest?.stats.byPriority[priority] ?? 0}
                  </span>
                </button>
              ))}
              <label className="manifest-status-filter">
                <ListFilter size={14} />
                <select
                  aria-label="任务状态筛选"
                  value={manifestStatus}
                  onChange={(event) => {
                    setManifestStatus(
                      event.target.value as ManifestStatusFilter,
                    );
                    setSelectedManifestTaskIds([]);
                  }}
                >
                  {manifestStatusFilters.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                      {status.value === "全部"
                        ? ` · ${manifestTasks.length}`
                        : ` · ${manifestStatusCounts[status.value]}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="manifest-search-filter">
                <Search size={14} />
                <input
                  value={manifestSearch}
                  placeholder="搜索 ID、名称、系统"
                  onChange={(event) => setManifestSearch(event.target.value)}
                />
              </label>
            </div>
            <div className="manifest-list-head">
              <span>显示 {visibleManifestTasks.length} 条</span>
              <span>
                {manifestRun.manifest.project.engine} ·{" "}
                {manifestRun.manifest.project.designResolution}
              </span>
            </div>
            <div className="manifest-batch-bar">
              <div className="manifest-overall-progress">
                <span>
                  <strong>整体生成进度 {manifestProgressStats.progress}%</strong>
                  <small>
                    已生成 {manifestProgressStats.generated}/
                    {manifestProgressStats.total} · 已采用{" "}
                    {manifestProgressStats.approved} · 进行中{" "}
                    {manifestProgressStats.active} · 失败{" "}
                    {manifestProgressStats.failed} · 待生成{" "}
                    {manifestProgressStats.pending}
                    {manifestProgressStats.manual
                      ? ` · 人工项 ${manifestProgressStats.manual}`
                      : ""}
                  </small>
                </span>
                <i>
                  <b
                    style={{ width: `${manifestProgressStats.progress}%` }}
                  />
                </i>
              </div>
              <div className="manifest-batch-actions">
                <label
                  className={`manifest-sticky-reference-toggle ${
                    manifestAttachStyleReference &&
                    manifestBatchStyleReference
                      ? "enabled"
                      : ""
                  }`}
                  title={
                    manifestBatchStyleReference
                      ? "每个新 Codex 批次共用一次当前参考图"
                      : "请先在左侧批次设置中选择参考图"
                  }
                >
                  <input
                    type="checkbox"
                    checked={
                      manifestAttachStyleReference &&
                      Boolean(manifestBatchStyleReference)
                    }
                    disabled={!manifestBatchStyleReference}
                    onChange={(event) =>
                      setManifestAttachStyleReference(event.target.checked)
                    }
                  />
                  <Image size={12} />
                  带参考图
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={
                      visibleManifestTasks.some(
                        (task) => task.generationMode !== "manual",
                      ) &&
                      visibleManifestTasks
                        .filter((task) => task.generationMode !== "manual")
                        .every((task) =>
                          selectedManifestTaskIds.includes(task.taskId),
                        )
                    }
                    onChange={(event) => {
                      const selectableIds = visibleManifestTasks
                        .filter((task) => task.generationMode !== "manual")
                        .map((task) => task.taskId);
                      setSelectedManifestTaskIds((current) =>
                        event.target.checked
                          ? [...new Set([...current, ...selectableIds])]
                          : current.filter(
                              (id) => !selectableIds.includes(id),
                            ),
                      );
                    }}
                  />
                  选择当前列表
                </label>
                <span>已选 {selectedManifestTaskIds.length} 项</span>
                <button
                  disabled={
                    !selectedManifestTaskIds.length ||
                    manifestQueueing ||
                    manifestApproving
                  }
                  onClick={() =>
                    void runManifestTasks(selectedManifestTaskIds)
                  }
                >
                  {manifestQueueing ? (
                    <LoaderCircle className="spin" size={13} />
                  ) : (
                    <Play size={13} />
                  )}
                  批量生成
                </button>
                <button
                  disabled={
                    !selectedReviewTasks.length ||
                    manifestQueueing ||
                    manifestApproving
                  }
                  title="采用每条任务当前选中的方案；未调整时默认采用第一张"
                  onClick={() => void approveSelectedManifestTasks()}
                >
                  {manifestApproving ? (
                    <LoaderCircle className="spin" size={13} />
                  ) : (
                    <CircleCheck size={13} />
                  )}
                  {manifestApproving
                    ? `采用 ${manifestApproveProgress.completed}/${manifestApproveProgress.total}`
                    : `批量采用 ${selectedReviewTasks.length || ""}`}
                </button>
              </div>
              {manifestRun.lastQueueSubmission ? (
                <div
                  className={`manifest-queue-receipt ${
                    manifestRun.lastQueueSubmission.acceptedCount ===
                    manifestRun.lastQueueSubmission.requestedCount
                      ? "complete"
                      : "warning"
                  }`}
                >
                  {manifestRun.lastQueueSubmission.acceptedCount ===
                  manifestRun.lastQueueSubmission.requestedCount ? (
                    <CircleCheck size={14} />
                  ) : (
                    <TriangleAlert size={14} />
                  )}
                  <span>
                    <strong>
                      上次提交：请求「
                      {manifestRun.lastQueueSubmission.requestedCount}」条，已入队「
                      {manifestRun.lastQueueSubmission.acceptedCount}」条，共「
                      {manifestRun.lastQueueSubmission.batchCount}」个批次
                    </strong>
                    <small>
                      {manifestRun.lastQueueSubmission.skippedCount
                        ? `跳过 ${manifestRun.lastQueueSubmission.skippedCount} 条：${[
                            ...new Set(
                              manifestRun.lastQueueSubmission.skipped.map(
                                (item) => item.reason,
                              ),
                            ),
                          ].join("、")}`
                        : "全部选中任务都已经创建生成记录，刷新或重开后仍可核对。"}
                    </small>
                  </span>
                </div>
              ) : null}
            </div>
            <div className="manifest-task-list">
              {visibleManifestBatches.map((batch, batchIndex) => {
                const completed = batch.tasks.filter((task) =>
                  ["REVIEW", "APPROVED"].includes(task.status),
                ).length;
                const batchProgress = Math.round(
                  batch.tasks.reduce(
                    (total, task) => total + (task.progress || 0),
                    0,
                  ) / Math.max(1, batch.tasks.length),
                );
                const selectableBatchIds = batch.tasks
                  .filter((task) => task.generationMode !== "manual")
                  .map((task) => task.taskId);
                const batchSelected =
                  selectableBatchIds.length > 0 &&
                  selectableBatchIds.every((id) =>
                    selectedManifestTaskIds.includes(id),
                  );
                return (
                  <section className="manifest-batch-group" key={batch.id}>
                    <header>
                      <label
                        className="manifest-batch-check"
                        title="选择这一批的全部任务"
                      >
                        <input
                          type="checkbox"
                          checked={batchSelected}
                          disabled={!selectableBatchIds.length}
                          onChange={(event) =>
                            setSelectedManifestTaskIds((current) =>
                              event.target.checked
                                ? [
                                    ...new Set([
                                      ...current,
                                      ...selectableBatchIds,
                                    ]),
                                  ]
                                : current.filter(
                                    (id) => !selectableBatchIds.includes(id),
                                  ),
                            )
                          }
                        />
                      </label>
                      <span>
                        <b>批次 {String(batchIndex + 1).padStart(2, "0")}</b>
                        <em>{batch.label}</em>
                      </span>
                      <small>
                        {completed}/{batch.tasks.length} 完成 · {batchProgress}%
                      </small>
                    </header>
                    <div>
                      {batch.tasks.map((task, taskIndex) => {
                        const taskTiming = manifestTaskTiming(task);
                        return (
                          <div
                            key={task.taskId}
                            className={
                              selectedManifestTask?.taskId === task.taskId
                                ? "active"
                                : ""
                            }
                          >
                          <label className="manifest-task-check">
                            <input
                              type="checkbox"
                              checked={selectedManifestTaskIds.includes(
                                task.taskId,
                              )}
                              disabled={task.generationMode === "manual"}
                              onChange={() =>
                                toggleManifestTaskSelection(task.taskId)
                              }
                            />
                          </label>
                          <button
                            className="manifest-task-open"
                            onClick={() =>
                              setSelectedManifestTaskId(task.taskId)
                            }
                          >
                            <span className={`manifest-priority ${task.priority}`}>
                              {task.priority}
                            </span>
                            <span className="manifest-task-copy">
                              <strong>
                                <i>
                                  {batch.persisted
                                    ? task.batchPosition + 1
                                    : taskIndex + 1}
                                </i>
                                {task.displayName}
                              </strong>
                              <code>{task.assetId}</code>
                              <small>
                                {task.system} · {task.size} · {task.quantity} 个
                              </small>
                            </span>
                            <span
                              className={`manifest-task-state ${task.status || "NOT_STARTED"}`}
                            >
                              {manifestTaskStatus[
                                task.status || "NOT_STARTED"
                              ]}
                              <small>
                                {task.status === "RUNNING" ||
                                task.status === "QUEUED"
                                  ? `${task.progress || 0}%${taskTiming ? ` · ${taskTiming}` : ""}`
                                  : `${task.format}${taskTiming ? ` · ${taskTiming}` : ""}`}
                              </small>
                            </span>
                          </button>
                          {(task.status === "RUNNING" ||
                            task.status === "QUEUED") && (
                            <i className="manifest-row-progress">
                              <b style={{ width: `${task.progress || 0}%` }} />
                            </i>
                          )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        ) : (
          <EmptyState
            icon={<ListChecks />}
            title="等待素材清单"
            text="Codex 会把散文、表格和命名约定整理成可执行的标准任务"
          />
        )}
      </section>

      <aside className="manifest-detail-pane panel-surface">
        {selectedManifestTask && manifestRun?.manifest ? (
          <>
            <div className="manifest-detail-head">
              <span className={`manifest-priority ${selectedManifestTask.priority}`}>
                {selectedManifestTask.priority}
              </span>
              <div>
                <strong>{selectedManifestTask.displayName}</strong>
                <code>{selectedManifestTask.assetId}</code>
              </div>
            </div>
            <div className="manifest-detail-actions">
              <button
                className="secondary-button"
                onClick={() => void saveAssetManifest()}
                disabled={manifestSaving}
              >
                {manifestSaving ? (
                  <LoaderCircle className="spin" size={14} />
                ) : (
                  <Save size={14} />
                )}
                保存修改
              </button>
              <button
                className="secondary-button"
                disabled={
                  selectedManifestTask.generationMode === "manual" ||
                  selectedManifestTask.status === "QUEUED" ||
                  selectedManifestTask.status === "RUNNING" ||
                  manifestQueueing
                }
                onClick={() =>
                  void runManifestTasks([selectedManifestTask.taskId])
                }
              >
                {manifestQueueing ? (
                  <LoaderCircle className="spin" size={14} />
                ) : (
                  <Play size={14} />
                )}
                {selectedManifestTask.attempts ? "重新生成" : "单独生成"}
              </button>
              <button
                className="primary-button"
                disabled={selectedManifestTask.generationMode === "manual"}
                onClick={() =>
                  loadManifestTaskIntoCreator(selectedManifestTask)
                }
              >
                {selectedManifestTask.generationMode === "manual" ? (
                  <FileText size={14} />
                ) : (
                  <Sparkles size={14} />
                )}
                {selectedManifestTask.generationMode === "manual"
                  ? "需人工处理"
                  : "载入创作台"}
              </button>
            </div>
            <div className="manifest-detail-scroll">
              <div
                className={`manifest-progress-card ${selectedManifestTask.status || "NOT_STARTED"}`}
              >
                <div>
                  <span>
                    <i />
                    {manifestTaskStatus[
                      selectedManifestTask.status || "NOT_STARTED"
                    ]}
                  </span>
                  <em>{selectedManifestTask.progress || 0}%</em>
                </div>
                <strong>
                  {selectedManifestTask.stage || "尚未生成，可单独或批量执行"}
                </strong>
                <div className="manifest-progress-track">
                  <i
                    style={{
                      width: `${selectedManifestTask.progress || 0}%`,
                    }}
                  />
                </div>
                <footer>
                  <small>
                    已执行 {selectedManifestTask.attempts || 0} 次
                  </small>
                  {selectedManifestTask.jobId && (
                    <button
                      onClick={() =>
                        void openJobLog(selectedManifestTask.jobId!)
                      }
                    >
                      <SquareTerminal size={12} />
                      查看日志
                    </button>
                  )}
                </footer>
                {selectedManifestTask.error && (
                  <p>{selectedManifestTask.error}</p>
                )}
              </div>
              {selectedManifestTask.outputUrls?.length > 0 && (
                <div className="manifest-output-section">
                  <div>
                    <strong>
                      {selectedManifestTaskIsBundle
                        ? "本次生成的套件文件"
                        : "本次生成效果"}
                    </strong>
                    <small>
                      {selectedManifestTaskIsBundle
                        ? `${selectedManifestBundleDeliverables} 个正式零件将全部采用${selectedManifestBundleExtras ? `，另含 ${selectedManifestBundleExtras} 个附加图集` : ""}`
                        : "点击图片选择最终采用版本"}
                    </small>
                  </div>
                  <div className="manifest-output-grid">
                    {selectedManifestTask.outputUrls.map((url, index) => (
                      <button
                        key={url}
                        className={
                          !selectedManifestTaskIsBundle &&
                          (selectedManifestTask.selectedOutputUrl ||
                            selectedManifestTask.outputUrls[0]) === url
                            ? "selected"
                            : ""
                        }
                        onClick={() => {
                          if (!selectedManifestTaskIsBundle) {
                            patchManifestTask(selectedManifestTask.taskId, {
                              selectedOutputUrl: url,
                            });
                          }
                          if (isVisualOutputUrl(url)) {
                            setManifestPreviewUrl(url);
                          } else {
                            window.open(url, "_blank");
                          }
                        }}
                      >
                        {isVisualOutputUrl(url) ? (
                          <img
                            src={url}
                            alt={`${selectedManifestTask.displayName} ${manifestOutputFileName(url)}`}
                          />
                        ) : (
                          <div className="manifest-file-output">
                            <b>{manifestOutputTypeLabel(url)}</b>
                            <small>{manifestOutputFileName(url)}</small>
                          </div>
                        )}
                        <span>
                          {selectedManifestTaskIsBundle
                            ? manifestOutputFileName(url)
                            : `方案 ${index + 1}`}
                        </span>
                        {!selectedManifestTaskIsBundle &&
                          (selectedManifestTask.selectedOutputUrl ||
                            selectedManifestTask.outputUrls[0]) === url && (
                            <CircleCheck size={14} />
                          )}
                      </button>
                    ))}
                  </div>
                  <button
                    className="manifest-approve-button"
                    onClick={() =>
                      void approveManifestTask(selectedManifestTask)
                    }
                  >
                    <CircleCheck size={14} />
                    {selectedManifestTask.status === "APPROVED"
                      ? selectedManifestTaskIsBundle
                        ? "重新归档整个套件"
                        : "重新采用并覆盖正式归档"
                      : selectedManifestTaskIsBundle
                        ? `确认采用整个套件（${selectedManifestBundleDeliverables} 项）`
                        : "确认采用并按清单归档"}
                  </button>
                  <small className="manifest-approve-hint">
                    {selectedManifestTaskIsBundle ? (
                      <>
                        将保留各文件现有名称并全部复制到 accepted/
                        {selectedManifestTask.runtimePath}
                      </>
                    ) : (
                      <>
                        将复制到当前任务存档的 accepted/
                        {selectedManifestTask.runtimePath}
                        {selectedManifestTask.runtimePath.endsWith("/")
                          ? ""
                          : "/"}
                        {selectedManifestTask.fileName.replace(
                          /<(?:stable_)?id>|\{(?:stable_)?id\}/gi,
                          selectedManifestTask.taskId.replace(/^task-/, ""),
                        )}
                      </>
                    )}
                  </small>
                  {selectedManifestTask.adoptedRelativePath && (
                    <div className="manifest-adopted-file">
                      <CircleCheck size={16} />
                      <div>
                        <strong>
                          {selectedManifestTask.adoptedFiles?.length > 1
                            ? `已归档 ${selectedManifestTask.adoptedFiles.length} 个套件文件`
                            : "已生成正式采用副本"}
                        </strong>
                        <code>{selectedManifestTask.adoptedRelativePath}</code>
                      </div>
                      <div className="manifest-adopted-actions">
                        <button
                          onClick={() =>
                            void revealOutputDirectory("accepted")
                          }
                        >
                          <FolderOutput size={13} />
                          目录
                        </button>
                        {selectedManifestTask.assetMetadataUrl && (
                          <a
                            href={selectedManifestTask.assetMetadataUrl}
                            download
                          >
                            <FileText size={13} />
                            描述 JSON
                          </a>
                        )}
                        {selectedManifestTask.adoptedFileUrl && (
                          <a href={selectedManifestTask.adoptedFileUrl} download>
                            <Download size={13} />
                            {selectedManifestTask.adoptedFiles?.length > 1
                              ? "首个文件"
                              : "图片"}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <label className="manifest-field">
                <span>生成提示词</span>
                <textarea
                  value={selectedManifestTask.prompt}
                  onChange={(event) =>
                    patchManifestTask(selectedManifestTask.taskId, {
                      prompt: event.target.value,
                    })
                  }
                />
              </label>
              <label className="manifest-field">
                <span>风格提示词</span>
                <textarea
                  value={selectedManifestTask.stylePrompt}
                  onChange={(event) =>
                    patchManifestTask(selectedManifestTask.taskId, {
                      stylePrompt: event.target.value,
                    })
                  }
                />
              </label>
              <div className="manifest-detail-grid">
                <label className="manifest-field">
                  <span>尺寸</span>
                  <input
                    value={selectedManifestTask.size}
                    onChange={(event) =>
                      patchManifestTask(selectedManifestTask.taskId, {
                        size: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="manifest-field">
                  <span>格式</span>
                  <input
                    value={selectedManifestTask.format}
                    onChange={(event) =>
                      patchManifestTask(selectedManifestTask.taskId, {
                        format: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <label className="manifest-field">
                <span>正式文件名</span>
                <input
                  value={selectedManifestTask.fileName}
                  onChange={(event) =>
                    patchManifestTask(selectedManifestTask.taskId, {
                      fileName: event.target.value,
                    })
                  }
                />
              </label>
              <label className="manifest-field">
                <span>游戏运行目录</span>
                <input
                  value={selectedManifestTask.runtimePath}
                  onChange={(event) =>
                    patchManifestTask(selectedManifestTask.taskId, {
                      runtimePath: event.target.value,
                    })
                  }
                />
              </label>
              <div className="manifest-spec-block">
                <strong>状态与交付</strong>
                <p>
                  {selectedManifestTask.states.length
                    ? selectedManifestTask.states.join(" · ")
                    : "单一默认状态"}
                </p>
                <small>
                  {selectedManifestTask.transparent ? "透明背景" : "非透明"}
                  {selectedManifestTask.ninePatch ? " · NinePatch" : ""}
                  {" · "}
                  {selectedManifestTask.quantity} 个交付项
                </small>
              </div>
              <div className="manifest-spec-block">
                <strong>技术要求</strong>
                <ul>
                  {selectedManifestTask.technicalRequirements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="manifest-spec-block">
                <strong>验收标准</strong>
                <ul>
                  {selectedManifestTask.acceptanceCriteria.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="manifest-export-actions">
              <button onClick={() => void revealOutputDirectory("all")}>
                <FolderOutput size={14} />
                打开全部生成结果
              </button>
              <button onClick={() => void revealOutputDirectory("manifest")}>
                <Archive size={14} />
                打开当前任务存档
              </button>
              <button
                onClick={() =>
                  downloadJson(
                    `${manifestRun.manifest?.project.name || "asset"}-ui-forge-tasks.json`,
                    manifestRun.manifest,
                  )
                }
              >
                <Download size={14} />
                导出标准 JSON
              </button>
              {manifestRun.manifestUrl && (
                <a href={manifestRun.manifestUrl} download>
                  <ExternalLink size={13} />
                  原始保存文件
                </a>
              )}
              {manifestRun.manifest.tasks.some(
                (task) => task.assetsCatalogUrl,
              ) && (
                <a
                  href={`/outputs/task-manifests/${manifestRun.id}/accepted/assets.json`}
                  download
                >
                  <Database size={13} />
                  素材语义索引
                </a>
              )}
            </div>
          </>
        ) : (
          <div className="manifest-contract">
            <FileText size={28} />
            <strong>标准格式会包含</strong>
            <ul>
              <li>稳定 assetId 与正式文件名</li>
              <li>尺寸、格式、透明与 NinePatch</li>
              <li>每条任务的完整风格提示词</li>
              <li>运行目录、状态和验收标准</li>
            </ul>
            <small>生成结果保存在本机 outputs/task-manifests/</small>
          </div>
        )}
      </aside>
      </div>
    </div>
  );

  const CreatorPage = () => (
    <div className="work-grid">
      <section className="composer panel-surface">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <Zap size={13} /> GUIDED GENERATOR
            </span>
            <h2>一句话生成向导</h2>
          </div>
          <button className="reset-button" onClick={() => setSpec(initialSpec)}>
            <RefreshCcw size={14} />
            重置
          </button>
        </div>
        <div className="wizard-progress">
          <span className="active">
            <b>1</b>说需求
          </span>
          <i />
          <span>
            <b>2</b>补规格
          </span>
          <i />
          <span>
            <b>3</b>选风格
          </span>
          <i />
          <span>
            <b>4</b>生成
          </span>
        </div>
        <div className="prompt-field">
          <textarea
            value={spec.prompt}
            onChange={(event) => updateSpec("prompt", event.target.value)}
            placeholder="例如：做一套肉鸽游戏的火焰技能按钮，要有默认、悬停、冷却和禁用状态"
            maxLength={500}
          />
          <div className="prompt-toolbar">
            <span>
              <Sparkles size={13} />
              不需要写专业提示词
            </span>
            <div>
              <button onClick={() => void enrichSpec()} disabled={isEnriching}>
                {isEnriching ? (
                  <LoaderCircle className="spin" size={12} />
                ) : (
                  <WandSparkles size={12} />
                )}
                {isEnriching ? "Codex 分析中…" : "Codex 智能补全"}
              </button>
              <b>{spec.prompt.length}/500</b>
            </div>
          </div>
        </div>
        <div className="guidance-grid">
          <label>
            <span>游戏类型</span>
            <select
              value={spec.gameGenre}
              onChange={(event) => updateSpec("gameGenre", event.target.value)}
            >
              {!gameGenres.includes(spec.gameGenre) && (
                <option>{spec.gameGenre}</option>
              )}
              {gameGenres.map((genre) => (
                <option key={genre}>{genre}</option>
              ))}
            </select>
          </label>
          <label>
            <span>目标引擎</span>
            <select
              value={spec.engine}
              onChange={(event) => updateSpec("engine", event.target.value)}
            >
              {engineOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="guidance-purpose">
            <span>界面用在哪里</span>
            <input
              value={spec.useCase}
              onChange={(event) => updateSpec("useCase", event.target.value)}
              placeholder="例如：战斗中的技能栏"
              maxLength={120}
            />
          </label>
        </div>
        <div className="field-block">
          <label>组件类型</label>
          <div className="kind-grid">
            {kinds.map((kind) => (
              <button
                key={kind.name}
                className={spec.kind === kind.name ? "selected" : ""}
                onClick={() => updateSpec("kind", kind.name)}
              >
                {kind.icon}
                <span>{kind.name}</span>
                {spec.kind === kind.name && <Check size={13} />}
              </button>
            ))}
          </div>
        </div>
        <div className="field-block guided-options">
          <div className="label-row">
            <label>需要哪些交互状态</label>
            <small>可多选</small>
          </div>
          <div className="option-chips">
            {stateOptions.map((state) => (
              <button
                key={state}
                className={spec.states.includes(state) ? "selected" : ""}
                onClick={() => toggleSpecList("states", state)}
              >
                {spec.states.includes(state) && <Check size={10} />}
                {state}
              </button>
            ))}
          </div>
        </div>
        <div className="field-block guided-options">
          <div className="label-row">
            <label>需要预留哪些内容</label>
            <small>系统会按这些区域排版</small>
          </div>
          <div className="option-chips">
            {elementOptions.map((element) => (
              <button
                key={element}
                className={spec.elements.includes(element) ? "selected" : ""}
                onClick={() => toggleSpecList("elements", element)}
              >
                {spec.elements.includes(element) && <Check size={10} />}
                {element}
              </button>
            ))}
          </div>
        </div>
        <div className="field-block">
          <div className="label-row">
            <label>视觉风格</label>
            <div className="label-actions">
              <button onClick={() => go("style-studio")}>
                <Plus size={11} /> 创作新风格
              </button>
              <button onClick={() => setModal("styles")}>管理风格库</button>
            </div>
          </div>
          {(() => {
            const activeIndex = Math.max(
              0,
              allStyles.findIndex((style) => style.name === spec.style),
            );
            const activeStyle = allStyles[activeIndex];
            return (
              <div className="style-selection">
                <div
                  className="style-reference-thumb"
                  style={styleThumb(activeStyle, activeIndex)}
                />
                <span>
                  <small>当前选中</small>
                  <strong>{activeStyle.name}</strong>
                  <em>{activeStyle.note}</em>
                </span>
                <CircleCheck size={15} />
              </div>
            );
          })()}
          <div className="style-list">
            {allStyles.map((style, index) => (
              <button
                key={style.name}
                className={spec.style === style.name ? "selected" : ""}
                aria-pressed={spec.style === style.name}
                onClick={(event) => selectStyleCard(event, style.name)}
              >
                <div
                  className="style-reference-thumb"
                  style={styleThumb(style, index)}
                >
                  <div className="style-swatches">
                    {style.colors.map((color) => (
                      <i key={color} style={{ background: color }} />
                    ))}
                  </div>
                </div>
                <span>
                  <strong>{style.name}</strong>
                  <small>{style.note}</small>
                </span>
                <i className="style-check">
                  {spec.style === style.name && <Check size={12} />}
                </i>
              </button>
            ))}
          </div>
          <div className="active-style-spec">
            <Sparkles size={13} />
            <span>
              <strong>完整风格提示词已注入</strong>
              <small>{spec.stylePrompt}</small>
            </span>
          </div>
        </div>
        <div className="field-block">
          <div className="label-row">
            <label>参考图或开源素材</label>
            <button
              onClick={() => {
                setPage("library");
                setLibraryView("sources");
              }}
            >
              从开源素材库选择
            </button>
          </div>
          {spec.reference ? (
            <div className="reference-card">
              <span>
                <img src={spec.reference.url} alt={spec.reference.name} />
              </span>
              <div>
                <small>
                  {spec.reference.source === "library"
                    ? "开源素材参考"
                    : "上传参考图"}
                </small>
                <strong>{spec.reference.name}</strong>
                <em>Codex 会参考构图、材质和轮廓，不复制文字</em>
              </div>
              <button onClick={() => updateSpec("reference", undefined)}>
                <X size={13} />
              </button>
            </div>
          ) : (
            <label className="reference-drop">
              {isUploadingReference ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Image size={17} />
              )}
              <span>
                <strong>上传一张参考图</strong>
                <small>PNG、JPG、WebP · 最大 12 MB</small>
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  void uploadReference(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          )}
        </div>
        <div className="settings-row">
          <label>
            <span>输出尺寸</span>
            <select
              value={spec.size}
              onChange={(event) => updateSpec("size", event.target.value)}
            >
              <option>512 × 256</option>
              <option>1024 × 1024</option>
              <option>1536 × 1024</option>
              <option>2048 × 2048</option>
            </select>
          </label>
          <label>
            <span>生成数量</span>
            <div className="stepper">
              <button
                onClick={() =>
                  updateSpec("variants", Math.max(1, spec.variants - 1))
                }
              >
                −
              </button>
              <b>{spec.variants}</b>
              <button
                onClick={() =>
                  updateSpec("variants", Math.min(8, spec.variants + 1))
                }
              >
                +
              </button>
            </div>
          </label>
        </div>
        <div className="toggle-list">
          <label>
            <div>
              <Image size={16} />
              <span>
                <strong>透明背景</strong>
                <small>Codex 自动做色键抠图并输出 PNG</small>
              </span>
            </div>
            <input
              type="checkbox"
              checked={spec.transparent}
              onChange={(event) =>
                updateSpec("transparent", event.target.checked)
              }
            />
            <i />
          </label>
          <label>
            <div>
              <LockKeyhole size={16} />
              <span>
                <strong>锁定风格 DNA</strong>
                <small>保持线条、光源、配色与圆角一致</small>
              </span>
            </div>
            <input
              type="checkbox"
              checked={spec.styleLock}
              onChange={(event) =>
                updateSpec("styleLock", event.target.checked)
              }
            />
            <i />
          </label>
        </div>
        <div className={`compiled-prompt ${showCompiledPrompt ? "open" : ""}`}>
          <button onClick={() => setShowCompiledPrompt((current) => !current)}>
            <span>
              <SquareTerminal size={14} />
              <strong>最终提示词预览</strong>
              <small>这才是发送给 Codex 的完整规格</small>
            </span>
            <ChevronDown size={14} />
          </button>
          {showCompiledPrompt && <pre>{compiledPrompt}</pre>}
        </div>
        <button
          className={`generate-button ${isGenerating ? "busy" : ""}`}
          onClick={() => void runGeneration()}
        >
          {isGenerating ? (
            <LoaderCircle className="spin" size={19} />
          ) : (
            <WandSparkles size={19} />
          )}
          <span>
            {isGenerating
              ? `Codex 正在生成 · ${progress}%`
              : `生成 ${spec.variants} 个设计变体`}
          </span>
          {!isGenerating && <kbd>⌘ ↵</kbd>}
          {isGenerating && <i style={{ width: `${progress}%` }} />}
        </button>
      </section>
      <section className="results panel-surface">
        <div className="results-header">
          <div>
            <span className="eyebrow">
              <GalleryHorizontalEnd size={13} /> RESULTS
            </span>
            <h2>
              生成结果 <b>{visibleAssets.length}</b>
            </h2>
          </div>
          <div className="view-controls">
            <button
              className={galleryMode === "grid" ? "active" : ""}
              onClick={() => setGalleryMode("grid")}
            >
              <Grid2X2 size={15} />
            </button>
            <button
              className={galleryMode === "focus" ? "active" : ""}
              onClick={() => setGalleryMode("focus")}
            >
              <Maximize2 size={15} />
            </button>
          </div>
        </div>
        <div className="filter-strip">
          <button
            className={filter === "全部" ? "active" : ""}
            onClick={() => setFilter("全部")}
          >
            全部
          </button>
          {kinds.map((kind) => (
            <button
              key={kind.name}
              className={filter === kind.name ? "active" : ""}
              onClick={() => setFilter(kind.name)}
            >
              {kind.name}
            </button>
          ))}
          <button className="filter-more" onClick={() => go("library")}>
            <ListFilter size={14} />
          </button>
        </div>
        <div className={`asset-gallery ${galleryMode}`}>
          {visibleAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              selected={selectedId === asset.id}
              onClick={() => setSelectedId(asset.id)}
              large={galleryMode === "focus"}
            />
          ))}
        </div>
        <div className="queue-bar">
          <div className="queue-icon">
            <LoaderCircle size={16} className={isGenerating ? "spin" : ""} />
          </div>
          <div>
            <strong>
              {isGenerating ? "Codex CLI 正在执行图像任务" : "本地生成队列空闲"}
            </strong>
            <span>
              {isGenerating
                ? "任务在受限项目目录中运行，可在记录页查看进度"
                : "生成内容会保存在 outputs/ 目录"}
            </span>
          </div>
          <button onClick={() => go("history")}>
            {isGenerating ? `${progress}%` : "查看记录"}
          </button>
        </div>
      </section>
      <aside className="inspector panel-surface">
        <Inspector
          asset={selected}
          onPreview={() => setModal("preview")}
          onRedraw={() => void runGeneration()}
          onExport={exportSelected}
          onEdit={() => go("export")}
        />
      </aside>
    </div>
  );

  const LibraryPage = () => (
    <section className="page-surface">
      <div className="page-toolbar">
        <div className="library-tabs">
          <button
            className={libraryView === "project" ? "active" : ""}
            onClick={() => setLibraryView("project")}
          >
            <LayoutDashboard size={14} /> 项目素材
          </button>
          <button
            className={libraryView === "sources" ? "active" : ""}
            onClick={() => {
              setLibraryView("sources");
              void refreshResources();
            }}
          >
            <Database size={14} /> 开源素材源
          </button>
        </div>
        {libraryView === "project" ? (
          <>
            <label className="search-field">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索名称、类型或风格…"
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X size={14} />
                </button>
              )}
            </label>
            <button className="primary-button" onClick={() => go("creator")}>
              <Plus size={15} /> 生成新素材
            </button>
          </>
        ) : (
          <button className="primary-button" onClick={() => setModal("styles")}>
            <Palette size={15} /> 打开资源中心
          </button>
        )}
      </div>
      {libraryView === "project" ? (
        <>
          <div className="filter-strip source-filter-strip">
            <button
              className={filter === "全部" ? "active" : ""}
              onClick={() => setFilter("全部")}
            >
              全部
            </button>
            {kinds.map((kind) => (
              <button
                key={kind.name}
                className={filter === kind.name ? "active" : ""}
                onClick={() => setFilter(kind.name)}
              >
                {kind.name}
              </button>
            ))}
          </div>
          <div className="library-layout">
            <div className="library-gallery">
              {visibleAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  selected={selectedId === asset.id}
                  onClick={() => setSelectedId(asset.id)}
                />
              ))}
              {!visibleAssets.length && (
                <EmptyState
                  icon={<Search />}
                  title="没有匹配素材"
                  text="调整搜索词或筛选条件后再试"
                />
              )}
            </div>
            <aside className="library-inspector panel-surface">
              <Inspector
                asset={selected}
                onPreview={() => setModal("preview")}
                onRedraw={() => {
                  const selectedPreset = allStyles.find(
                    (style) => style.name === selected.style,
                  );
                  setSpec((current) => ({
                    ...current,
                    kind: selected.kind,
                    style: selected.style,
                    stylePrompt: selectedPreset?.prompt || current.stylePrompt,
                  }));
                  go("creator");
                }}
                onExport={exportSelected}
                onEdit={() => go("export")}
              />
            </aside>
          </div>
        </>
      ) : (
        <div className="source-library">
          <div className="source-intro">
            <div>
              <Database size={20} />
              <span>
                <strong>
                  已登记 {assetSources.length} 个开源来源 · 本地已导入{" "}
                  {resourceStatuses.filter((item) => item.installed).length} 个
                </strong>
                <small>
                  导入前保留来源与许可证信息，CC BY 素材会自动提示署名。
                </small>
              </span>
            </div>
            <button onClick={() => setModal("styles")}>
              <Cpu size={14} />
              同时查看本地模型
            </button>
          </div>
          {browsingResource && (
            <section className="imported-browser">
              <div className="imported-browser-head">
                <div>
                  <span className="eyebrow">
                    <Database size={12} /> LOCAL FILES
                  </span>
                  <strong>
                    {
                      assetSources.find(
                        (source) => source.id === browsingResource,
                      )?.name
                    }
                  </strong>
                  <small>
                    显示前 {resourceFiles.length} 个文件 · 点击即可设为生成参考
                  </small>
                </div>
                <button
                  onClick={() => {
                    setBrowsingResource(null);
                    setResourceFiles([]);
                  }}
                >
                  <X size={14} />
                  关闭
                </button>
              </div>
              <div className="imported-file-grid">
                {resourceFiles.map((file) => (
                  <button
                    key={file.relativePath}
                    onClick={() => useLibraryReference(file)}
                    title={`使用 ${file.relativePath} 作为生成参考`}
                  >
                    <span>
                      <img src={file.url} alt={file.name} loading="lazy" />
                      <em>设为参考</em>
                    </span>
                    <b>{file.name.replace(/\.(svg|png|webp|jpe?g)$/i, "")}</b>
                  </button>
                ))}
              </div>
            </section>
          )}
          <div className="source-grid">
            {assetSources.map((source) => {
              const status = resourceStatuses.find(
                (item) => item.id === source.id,
              );
              const importable =
                source.id === "kenney-ui" || source.id === "game-icons";
              return (
                <article className="source-card" key={source.id}>
                  <div
                    className="source-cover"
                    style={
                      {
                        "--s1": source.colors[0],
                        "--s2": source.colors[1],
                        "--s3": source.colors[2],
                      } as CSSProperties
                    }
                  >
                    <span />
                    <span />
                    <span />
                    <span />
                    <b className={source.licenseTone}>{source.license}</b>
                  </div>
                  <div className="source-body">
                    <div>
                      <strong>{source.name}</strong>
                      <span>
                        {source.count} · {source.format}
                      </span>
                    </div>
                    <p>{source.description}</p>
                    <div className="source-tags">
                      {source.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    {importable ? (
                      <button
                        className={
                          status?.installed ? "resource-installed" : ""
                        }
                        disabled={importingResource === source.id}
                        onClick={() =>
                          status?.installed
                            ? void browseOpenResource(source.id)
                            : void importOpenResource(source.id)
                        }
                      >
                        {importingResource === source.id ? (
                          <LoaderCircle className="spin" size={14} />
                        ) : status?.installed ? (
                          <CircleCheck size={14} />
                        ) : (
                          <Download size={14} />
                        )}
                        {importingResource === source.id
                          ? "正在下载并解压…"
                          : status?.installed
                            ? `浏览 ${status.fileCount} 个本地文件`
                            : "一键导入到本地素材库"}
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          window.open(
                            source.url,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                      >
                        <ExternalLink size={14} />
                        打开官方素材库
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="license-banner">
            <LockKeyhole size={16} />
            <span>
              <strong>许可证随资源保存</strong>
              <small>
                Kenney 与 Superpowers 为 CC0；Game-icons.net 为 CC BY
                3.0，项目发布时需要保留作者署名。
              </small>
            </span>
          </div>
        </div>
      )}
    </section>
  );

  const KitsPage = () => (
    <section className="page-surface">
      <div className="stats-row">
        <div>
          <strong>{allStyles.length}</strong>
          <span>风格套装</span>
        </div>
        <div>
          <strong>{assets.length}</strong>
          <span>可复用组件</span>
        </div>
        <div>
          <strong>94%</strong>
          <span>平均一致性</span>
        </div>
      </div>
      <div className="kit-grid">
        {allStyles.map((style, index) => {
          const kitAssets = assets.filter(
            (asset) => asset.style === style.name,
          );
          return (
            <article className="kit-card" key={style.name}>
              <div
                className="kit-cover"
                style={
                  {
                    "--k1": style.colors[0],
                    "--k2": style.colors[1],
                    "--k3": style.colors[2],
                  } as CSSProperties
                }
              >
                <span />
                <span />
                <span />
              </div>
              <div className="kit-info">
                <div>
                  <strong>{style.name}</strong>
                  <span>{style.note}</span>
                </div>
                <b>{kitAssets.length || index + 3} 个组件</b>
              </div>
              <div className="kit-actions">
                <button
                  onClick={() => {
                    selectStyle(style.name);
                    go("creator");
                  }}
                >
                  <WandSparkles size={14} />
                  沿用风格生成
                </button>
                <button
                  onClick={() => {
                    setSearch(style.name);
                    go("library");
                  }}
                >
                  <Eye size={14} />
                  查看素材
                </button>
              </div>
            </article>
          );
        })}
        <button
          className="new-kit"
          onClick={() => {
            setModal("styles");
            notify("选择一个风格作为新套装起点");
          }}
        >
          <CirclePlus size={28} />
          <strong>创建组件套装</strong>
          <span>从风格 DNA 或现有素材开始</span>
        </button>
      </div>
    </section>
  );

  const HistoryPage = () => (
    <section className="page-surface">
      <div className="page-toolbar">
        <div className="history-summary">
          <span className="status-dot" />
          <strong>本地 Codex 任务</strong>
          <small>
            {jobs.filter((job) => job.status === "running").length} 个运行中 ·{" "}
            {jobs.filter((job) => job.status === "completed").length} 个已完成
          </small>
        </div>
        <button className="secondary-button" onClick={() => void refreshJobs()}>
          <RefreshCcw size={14} />
          刷新
        </button>
      </div>
      {jobs.length ? (
        <div className="job-list">
          {jobs.map((job) => (
            <article className="job-row" key={job.id}>
              <div className={`job-status ${job.status}`}>
                {job.status === "completed" ? (
                  <CircleCheck />
                ) : job.status === "failed" ? (
                  <CircleX />
                ) : (
                  <LoaderCircle
                    className={job.status === "running" ? "spin" : ""}
                  />
                )}
              </div>
              <div className="job-main">
                <div>
                  <strong>
                    {job.spec.kind} · {job.spec.style}
                  </strong>
                  <span>{new Date(job.createdAt).toLocaleString("zh-CN")}</span>
                </div>
                <p>{job.spec.prompt}</p>
                <div className="job-progress">
                  <i style={{ width: `${job.progress}%` }} />
                </div>
                <small>
                  {job.stage}
                  {job.error ? ` · ${job.error.slice(-160)}` : ""}
                </small>
              </div>
              <div className="job-output">
                <strong>{job.outputUrls.length}</strong>
                <span>输出文件</span>
                <div className="job-actions">
                  <button
                    onClick={() => void openJobLog(job.id)}
                    disabled={loadingJobLog === job.id}
                  >
                    {loadingJobLog === job.id ? (
                      <LoaderCircle className="spin" size={13} />
                    ) : (
                      <SquareTerminal size={13} />
                    )}
                    日志
                  </button>
                  {job.status === "failed" && (
                    <button onClick={() => retryJob(job)}>
                      <RefreshCcw size={13} />
                      重试
                    </button>
                  )}
                  {job.outputUrls[0] && (
                    <button
                      onClick={() => window.open(job.outputUrls[0], "_blank")}
                    >
                      <Eye size={13} />
                      预览
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Archive />}
          title="还没有真实生成记录"
          text="在创作台提交后，本机 Codex 的任务会显示在这里"
          action={
            <button className="primary-button" onClick={() => go("creator")}>
              开始第一次生成
            </button>
          }
        />
      )}
    </section>
  );

  const SplitSheetPage = () => {
    const activeCount =
      splitSession?.regions.filter((region) => region.active).length ?? 0;
    const batchAnalyzing = splitItems.some((item) =>
      ["queued", "analyzing"].includes(item.status),
    );
    const readyCount = splitItems.filter(
      (item) => item.status === "ready",
    ).length;
    return (
      <section className="split-workspace">
        <div className="split-main panel-surface">
          <input
            ref={splitFileInputRef}
            className="split-hidden-input"
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            disabled={batchAnalyzing}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length) void importSplitFiles(files);
              event.currentTarget.value = "";
            }}
          />
          <div className="tool-canvas-head">
            <div>
              <strong>区域检测预览</strong>
              <span>
                {activeSplitItem?.status === "analyzing"
                  ? `正在检测 ${activeSplitItem.file.name}`
                  : splitSession
                  ? splitSession.mode === "table" && splitSession.grid
                    ? `自适应网格 ${splitSession.grid.rows}×${splitSession.grid.columns} · ${splitSession.regions.length} 个区域`
                    : `${splitSession.mode} 模式 · ${splitSession.regions.length} 个候选区域`
                  : splitItems.length
                    ? "从右侧图片列表选择或重试"
                    : "一次选择多张 PNG、JPG 或 WebP 素材表"}
              </span>
            </div>
            {activeSplitItem && (
              <div className="split-head-actions">
                <button
                  className="secondary-button"
                  onClick={() => splitFileInputRef.current?.click()}
                  disabled={batchAnalyzing}
                >
                  <Plus size={14} />
                  添加图片
                </button>
                <button
                  className="secondary-button"
                  onClick={() => void reanalyzeActiveSheet()}
                  disabled={batchAnalyzing || Boolean(splitExportingId)}
                >
                  <RefreshCcw
                    size={14}
                    className={splitBusy === "analyze" ? "spin" : ""}
                  />
                  重新检测
                </button>
              </div>
            )}
          </div>

          {splitSession && activeSplitItem?.status === "ready" ? (
            <>
              <div className="split-preview">
                <img
                  src={`${splitSession.previewUrl}?v=${splitSession.id}`}
                  alt={`${splitSession.sourceName} 编号区域预览`}
                />
              </div>
              <div className="split-legend">
                <span>
                  <i className="legend-box" />
                  编号框是候选裁切区域
                </span>
                <span>
                  <LockKeyhole size={12} />
                  预览会缩小，导出始终使用原图像素
                </span>
              </div>
            </>
          ) : splitItems.length ? (
            <div className="split-processing-state">
              {activeSplitItem?.status === "failed" ? (
                <CircleX size={38} />
              ) : (
                <LoaderCircle className="spin" size={38} />
              )}
              <strong>
                {activeSplitItem?.status === "failed"
                  ? "这张图片检测失败"
                  : "正在按顺序检测图片"}
              </strong>
              <span>
                {activeSplitItem?.error ||
                  "检测完成后会自动显示编号区域预览"}
              </span>
              {activeSplitItem?.status === "failed" && (
                <button
                  className="secondary-button"
                  onClick={() => void reanalyzeActiveSheet()}
                  disabled={batchAnalyzing}
                >
                  <RefreshCcw size={14} />
                  重试当前图片
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              className={`split-dropzone ${splitBusy ? "busy" : ""}`}
              disabled={batchAnalyzing}
              onClick={() => splitFileInputRef.current?.click()}
            >
              {splitBusy === "analyze" ? (
                <LoaderCircle className="spin" size={38} />
              ) : (
                <Images size={42} />
              )}
              <strong>
                {splitBusy === "analyze"
                  ? "正在本地检测素材区域"
                  : "批量选择整图素材表"}
              </strong>
              <span>
                支持一次选择最多 20 张 · 不上传云端 · 不消耗 Codex 额度
              </span>
            </button>
          )}

          {splitExport && (
            <div className="split-results">
              <div className="split-results-head">
                <div>
                  <strong>已导出 {splitExport.exported} 个原尺寸 PNG</strong>
                  <span>所有文件均标记 resampled: false</span>
                </div>
                <a
                  className="primary-button"
                  href={splitExport.zipUrl}
                  download
                >
                  <Download size={15} />
                  下载 ZIP
                </a>
              </div>
              <div className="split-result-grid">
                {splitExport.files.map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    download
                    title="点击下载原始尺寸 PNG"
                  >
                    <img src={file.url} alt={file.name} />
                    <span>
                      <strong>{file.name}.png</strong>
                      <small>
                        {file.width} × {file.height} ·{" "}
                        {file.frameMode === "remove" ? "已去外框" : "保留外框"}
                      </small>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="split-settings panel-surface">
          <span className="eyebrow">
            <Scissors size={13} /> LOSSLESS SPLITTER
          </span>
          <h2>拆图设置</h2>
          <p>
            分割与导出由本地脚本完成。AI 只在需要识别内容并自动命名时才有用。
          </p>

          <button
            type="button"
            className="split-file-button secondary-button"
            onClick={() => splitFileInputRef.current?.click()}
            disabled={batchAnalyzing}
          >
            <Plus size={15} />
            {splitItems.length ? "继续添加图片" : "批量选择图片"}
          </button>

          {splitItems.length > 0 && (
            <>
              <div className="split-batch-head">
                <strong>图片列表</strong>
                <span>
                  {readyCount} / {splitItems.length} 已完成
                </span>
              </div>
              <div className="split-image-list">
                {splitItems.map((item) => (
                  <div
                    key={item.localId}
                    className={
                      item.localId === activeSplitItem?.localId
                        ? "selected"
                        : ""
                    }
                  >
                    <button
                      className="split-image-select"
                      onClick={() => setActiveSplitId(item.localId)}
                    >
                      <span className="split-image-thumb">
                        {item.session ? (
                          <img
                            src={item.session.previewUrl}
                            alt=""
                            loading="lazy"
                          />
                        ) : item.status === "failed" ? (
                          <CircleX size={16} />
                        ) : (
                          <LoaderCircle className="spin" size={16} />
                        )}
                      </span>
                      <span>
                        <strong>{item.file.name}</strong>
                        <small>
                          {item.status === "ready"
                            ? `${item.session?.regions.length ?? 0} 个区域`
                            : item.status === "failed"
                              ? "检测失败"
                              : item.status === "analyzing"
                                ? "正在检测"
                                : "等待检测"}
                          {item.exportResult
                            ? ` · 已导出 ${item.exportResult.exported}`
                            : ""}
                        </small>
                      </span>
                    </button>
                    <button
                      className="split-image-remove"
                      aria-label={`移除 ${item.file.name}`}
                      title="从列表移除"
                      disabled={["queued", "analyzing"].includes(item.status)}
                      onClick={() => removeSplitItem(item.localId)}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <label className="select-field">
            <span>检测模式</span>
            <select
              value={splitMode}
              onChange={(event) =>
                setSplitMode(
                  event.target.value as
                    | "auto"
                    | "frames"
                    | "layout"
                    | "table",
                )
              }
            >
              <option value="auto">自动判断（推荐）</option>
              <option value="frames">规则边框 / 图标格</option>
              <option value="layout">不规则排版 / 混合组件</option>
              <option value="table">自适应网格 / 共享边线</option>
            </select>
          </label>

          {splitMode === "table" && (
            <div className="split-grid-settings">
              <label>
                <span>行数</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={splitGridRows}
                  onChange={(event) =>
                    setSplitGridRows(
                      Math.max(
                        1,
                        Math.min(
                          50,
                          Math.floor(250 / splitGridColumns),
                          Number(event.target.value) || 1,
                        ),
                      ),
                    )
                  }
                />
              </label>
              <label>
                <span>列数</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={splitGridColumns}
                  onChange={(event) =>
                    setSplitGridColumns(
                      Math.max(
                        1,
                        Math.min(
                          50,
                          Math.floor(250 / splitGridRows),
                          Number(event.target.value) || 1,
                        ),
                      ),
                    )
                  }
                />
              </label>
              <small>
                先按 {splitGridRows} × {splitGridColumns} 检测；系统会吸附真实边线，并校验相邻行列数
              </small>
            </div>
          )}

          {splitSession?.mode === "table" && splitSession.grid && (
            <div
              className={`split-grid-result ${
                splitSession.grid.autoAdjusted ? "is-adjusted" : ""
              }`}
            >
              <Grid2X2 size={16} />
              <span>
                <strong>
                  实际识别：{splitSession.grid.rows} ×{" "}
                  {splitSession.grid.columns}
                </strong>
                <small>
                  {splitSession.grid.autoAdjusted
                    ? `已从 ${splitSession.grid.requestedRows}×${splitSession.grid.requestedColumns} 自动校正；请在左侧预览确认边界`
                    : "已按整图连续边线吸附，不再使用等宽等高硬切"}
                </small>
              </span>
            </div>
          )}

          {splitSession?.mode === "layout" &&
            splitSession.regions.length === 1 && (
              <div className="split-grid-hint">
                <Grid2X2 size={16} />
                <span>
                  <strong>检测到一个连通大区域</strong>
                  <small>
                    如果图片像表格一样共享边线，请填写实际行列数后使用规则网格。
                  </small>
                </span>
                <button
                  onClick={() => {
                    setSplitMode("table");
                    if (activeSplitItem)
                      void analyzeSplitItem(
                        activeSplitItem.localId,
                        activeSplitItem.file,
                        "table",
                        splitGridRows,
                        splitGridColumns,
                      );
                  }}
                  disabled={batchAnalyzing}
                >
                  按 {splitGridRows}×{splitGridColumns} 重试
                </button>
              </div>
            )}

          {splitSession && activeSplitItem?.status === "ready" && (
            <>
              <div className="split-selection-head">
                <strong>导出区域</strong>
                <span>
                  {activeCount} / {splitSession.regions.length}
                </span>
              </div>
              <div className="split-selection-actions">
                <button onClick={() => setAllSplitRegions(true)}>全选</button>
                <button onClick={() => setAllSplitRegions(false)}>全不选</button>
              </div>
              <div className="split-region-list">
                {splitSession.regions.map((region) => (
                  <label key={region.id}>
                    <input
                      type="checkbox"
                      checked={region.active}
                      onChange={() => toggleSplitRegion(region.id)}
                    />
                    <span>
                      <strong>#{region.id}</strong>
                      <small>
                        {region.width} × {region.height}
                      </small>
                    </span>
                    <em>{Math.round(region.confidence * 100)}%</em>
                  </label>
                ))}
              </div>

              <div className="split-frame-options">
                <strong>外框处理</strong>
                <button
                  className={splitFrameMode === "keep" ? "selected" : ""}
                  onClick={() => setActiveSplitFrameMode("keep")}
                >
                  <Frame size={15} />
                  <span>
                    <b>保留外框</b>
                    <small>适合直接使用完整按钮或图标</small>
                  </span>
                </button>
                <button
                  className={splitFrameMode === "remove" ? "selected" : ""}
                  onClick={() => setActiveSplitFrameMode("remove")}
                >
                  <Scissors size={15} />
                  <span>
                    <b>智能去外框</b>
                    <small>低置信度时会安全回退为保留</small>
                  </span>
                </button>
              </div>

              <button
                className="primary-button wide large"
                onClick={() => void exportSheet()}
                disabled={Boolean(splitBusy) || !activeCount}
              >
                {splitBusy === "export" ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <FolderOutput size={17} />
                )}
                {splitBusy === "export"
                  ? "正在无损裁切"
                  : `导出 ${activeCount} 个 PNG`}
              </button>
            </>
          )}
        </aside>
      </section>
    );
  };

  const NineSlicePage = () => (
    <section className="tool-layout">
      <div className="tool-canvas panel-surface">
        <div className="tool-canvas-head">
          <strong>实时预览</strong>
          <span>拖动参数查看拉伸安全区</span>
        </div>
        <div className="slice-stage">
          <div className="slice-art">
            <AssetPreview asset={selected} large />
            <i
              className="guide vertical left"
              style={{ left: `${slice.left}%` }}
            />
            <i
              className="guide vertical right"
              style={{ right: `${slice.right}%` }}
            />
            <i
              className="guide horizontal top"
              style={{ top: `${slice.top}%` }}
            />
            <i
              className="guide horizontal bottom"
              style={{ bottom: `${slice.bottom}%` }}
            />
          </div>
          <div className="stretch-preview">
            <AssetPreview asset={selected} large />
          </div>
        </div>
      </div>
      <aside className="tool-settings panel-surface">
        <span className="eyebrow">
          <Scissors size={13} /> 9-SLICE
        </span>
        <h2>切片边界</h2>
        <p>保护边框和角饰，只拉伸中央内容区。</p>
        {Object.entries(slice).map(([key, value]) => (
          <label className="range-field" key={key}>
            <span>
              <b>
                {
                  { top: "顶部", right: "右侧", bottom: "底部", left: "左侧" }[
                    key
                  ]
                }
              </b>
              <em>{value}%</em>
            </span>
            <input
              type="range"
              min="8"
              max="42"
              value={value}
              onChange={(event) =>
                setSlice((current) => ({
                  ...current,
                  [key]: Number(event.target.value),
                }))
              }
            />
          </label>
        ))}
        <button
          className="primary-button wide"
          onClick={() =>
            downloadJson(`${selected.id}.9slice.json`, {
              asset: selected.id,
              slice,
            })
          }
        >
          <Download size={15} />
          导出切片配置
        </button>
      </aside>
    </section>
  );

  const AtlasPage = () => (
    <section className="tool-layout atlas-layout">
      <div className="tool-canvas panel-surface">
        <div className="tool-canvas-head">
          <strong>图集预览</strong>
          <span>{atlasIds.length} 个素材 · 自动紧凑排列</span>
        </div>
        <div className="atlas-board">
          {assets
            .filter((asset) => atlasIds.includes(asset.id))
            .map((asset) => (
              <div key={asset.id}>
                <AssetPreview asset={asset} />
                <span>{asset.name}</span>
              </div>
            ))}
        </div>
      </div>
      <aside className="tool-settings panel-surface">
        <span className="eyebrow">
          <Package size={13} /> ATLAS
        </span>
        <h2>选择素材</h2>
        <p>点击下方素材加入或移出图集。</p>
        <div className="atlas-picker">
          {assets.map((asset) => (
            <button
              key={asset.id}
              className={atlasIds.includes(asset.id) ? "selected" : ""}
              onClick={() => toggleAtlas(asset.id)}
            >
              <span style={cssVars(asset)}>
                <AssetPreview asset={asset} />
              </span>
              <b>{asset.name}</b>
              {atlasIds.includes(asset.id) && <Check size={13} />}
            </button>
          ))}
        </div>
        <label className="select-field">
          <span>最大尺寸</span>
          <select>
            <option>2048 × 2048</option>
            <option>4096 × 4096</option>
            <option>1024 × 1024</option>
          </select>
        </label>
        <button
          className="primary-button wide"
          onClick={() =>
            downloadJson("ui-forge-atlas.json", {
              size: 2048,
              padding: 4,
              assets: atlasIds,
            })
          }
        >
          <Download size={15} />
          导出图集清单
        </button>
      </aside>
    </section>
  );

  const ExportPage = () => (
    <section className="export-layout">
      <div className="panel-surface export-form">
        <span className="eyebrow">
          <Gamepad2 size={13} /> ENGINE EXPORT
        </span>
        <h2>选择目标引擎</h2>
        <div className="engine-grid">
          {(["Godot 4", "Unity", "Web / Phaser"] as const).map((item) => (
            <button
              key={item}
              className={engine === item ? "selected" : ""}
              onClick={() => setEngine(item)}
            >
              <Gamepad2 size={22} />
              <strong>{item}</strong>
              <span>
                {item === "Godot 4"
                  ? "PNG + .tres + 9-patch"
                  : item === "Unity"
                    ? "PNG + Sprite Meta"
                    : "PNG + JSON Atlas"}
              </span>
              {engine === item && <Check size={15} />}
            </button>
          ))}
        </div>
        <div className="export-options">
          <label>
            <span>导出倍率</span>
            <select
              value={exportScale}
              onChange={(event) => setExportScale(event.target.value)}
            >
              <option>1×</option>
              <option>2×</option>
              <option>4×</option>
            </select>
          </label>
          <label>
            <span>命名规则</span>
            <select>
              <option>snake_case</option>
              <option>kebab-case</option>
              <option>PascalCase</option>
            </select>
          </label>
          <label className="check-row">
            <input type="checkbox" defaultChecked />
            <span>
              <strong>包含九宫格配置</strong>
              <small>自动转换为引擎可识别的边界参数</small>
            </span>
          </label>
          <label className="check-row">
            <input type="checkbox" defaultChecked />
            <span>
              <strong>生成资源清单</strong>
              <small>包含名称、尺寸、类型和来源任务</small>
            </span>
          </label>
        </div>
        <button
          className="primary-button wide large"
          onClick={() =>
            downloadJson(
              `ui-forge-${engine.toLowerCase().replaceAll(" ", "-")}-export.json`,
              { engine, scale: exportScale, slice, assets },
            )
          }
        >
          <FolderOutput size={17} />
          生成 {engine} 导出包清单
        </button>
      </div>
      <aside className="panel-surface export-preview">
        <div className="inspector-title">
          <div>
            <FolderOutput size={16} />
            <strong>交付内容</strong>
          </div>
        </div>
        <div className="file-tree">
          <span>ui-forge-export/</span>
          <span className="indent">assets/</span>
          {assets.slice(0, 5).map((asset) => (
            <b className="indent2" key={asset.id}>
              {asset.name.replaceAll(" ", "_")}.png
            </b>
          ))}
          <span className="indent">metadata/</span>
          <b className="indent2">manifest.json</b>
          <b className="indent2">nine_slice.json</b>
          <b>
            {engine === "Godot 4"
              ? "import.gd"
              : engine === "Unity"
                ? "SpriteImporter.cs"
                : "atlas.json"}
          </b>
        </div>
        <div className="export-note">
          <SquareTerminal size={16} />
          <span>
            <strong>不会执行引擎命令</strong>
            <small>
              这里只生成本地资源清单与导入配置，不会修改你的游戏工程。
            </small>
          </span>
        </div>
      </aside>
    </section>
  );

  const renderPage = () => {
    switch (page) {
      case "style-studio":
        return (
          <StyleStudioPage
            projects={styleProjects}
            activeProjectId={activeStyleProjectId}
            setActiveProjectId={setActiveStyleProjectId}
            updateProject={(updated) =>
              setStyleProjects((current) => [
                updated,
                ...current.filter((item) => item.id !== updated.id),
              ])
            }
            refreshProjects={refreshStyleProjects}
            onStyleSaved={saveStudioStyleToWorkspace}
            notify={notify}
          />
        );
      case "manifest":
        return ManifestPage();
      case "library":
        return LibraryPage();
      case "kits":
        return KitsPage();
      case "history":
        return HistoryPage();
      case "split-sheet":
        return SplitSheetPage();
      case "nine-slice":
        return NineSlicePage();
      case "atlas":
        return AtlasPage();
      case "export":
        return ExportPage();
      case "creator":
      default:
        return CreatorPage();
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <WandSparkles size={20} />
          </div>
          <div>
            <strong>UI Forge</strong>
            <span>Game asset studio</span>
          </div>
        </div>
        <button
          className="project-switcher"
          onClick={() => notify("当前项目：迷雾远征 · 本地工作区")}
        >
          <div className="project-avatar">EF</div>
          <div>
            <strong>迷雾远征</strong>
            <span>UI kit · 本地工作区</span>
          </div>
          <ChevronDown size={15} />
        </button>
        <nav>
          {navGroups.map((group, index) => (
            <div className="nav-group" key={group.label}>
              <span className={`nav-label ${index ? "secondary" : ""}`}>
                {group.label}
              </span>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${page === item.id ? "active" : ""}`}
                  onClick={() => go(item.id)}
                >
                  {item.icon}
                  {item.label}
                  {item.id === "library" && (
                    <span className="nav-count">{assets.length}</span>
                  )}
                  {item.id === "creator" && <kbd>G</kbd>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`engine-status ${health?.ok ? "online" : "offline"}`}
            onClick={() => setModal("settings")}
          >
            <span className="status-dot" />
            <div>
              <strong>Codex 图像后端</strong>
              <span>
                {health?.ok
                  ? "已连接 · ChatGPT 登录"
                  : health === null
                    ? "正在检测本地服务"
                    : "未连接 · 点击检查"}
              </span>
            </div>
            <Settings2 size={16} />
          </button>
          <div className="usage-card">
            <div>
              <span>本地任务</span>
              <strong>{jobs.length} 次</strong>
            </div>
            <div className="usage-track">
              <i style={{ width: `${Math.min(100, jobs.length * 8)}%` }} />
            </div>
            <small>使用当前 Codex / ChatGPT 额度</small>
          </div>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <p>{pageMeta[page].eyebrow}</p>
            <h1>
              {pageMeta[page].title}{" "}
              {page === "creator" && <span className="beta">LOCAL</span>}
            </h1>
            <span className="page-description">
              {pageMeta[page].description}
            </span>
          </div>
          <div className="top-actions">
            {page !== "style-studio" ? (
              <button
                className="icon-button"
                aria-label="搜索"
                onClick={() => setModal("search")}
              >
                <Search size={18} />
              </button>
            ) : null}
            <button
              className="secondary-button"
              onClick={() => setModal("flow")}
            >
              <Play size={15} fill="currentColor" />
              查看流程
            </button>
            <button
              className="primary-button"
              onClick={() =>
                page === "style-studio"
                  ? setModal("styles")
                  : page === "manifest" && manifestRun?.manifest
                    ? exportManifestArchive()
                    : exportSelected()
              }
              disabled={page === "manifest" && !manifestRun?.manifest}
              title={
                page === "manifest"
                  ? "导出当前任务、批次进度与生成记录的 JSON 备份"
                  : undefined
              }
            >
              {page === "style-studio" ? (
                <Palette size={16} />
              ) : (
                <Download size={16} />
              )}
              {page === "style-studio"
                ? "查看风格库"
                : page === "manifest"
                  ? "导出当前存档"
                  : "导出所选"}
            </button>
          </div>
        </header>
        <div className={`page-content page-${page}`}>{renderPage()}</div>
      </main>
      {modal && (
        <Modal
          type={modal}
          page={page}
          close={() => setModal(null)}
          health={health}
          assets={assets}
          selected={selected}
          styles={allStyles}
          openCustomStyle={() => {
            setModal(null);
            go("style-studio");
          }}
          deleteStyle={(style) => void deleteCustomStyle(style)}
          chooseAsset={(id) => {
            setSelectedId(id);
            setModal("preview");
          }}
          chooseStyle={(style) => {
            selectStyle(style);
            setModal(null);
            notify(`已选择 ${style}`);
          }}
        />
      )}
      {customStyleOpen && (
        <CustomStyleModal
          close={() => setCustomStyleOpen(false)}
          onSaved={saveCustomStyleToWorkspace}
        />
      )}
      {jobLog && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setJobLog(null);
          }}
        >
          <section className="job-log-modal">
            <header>
              <div>
                <span className="eyebrow">
                  <SquareTerminal size={13} /> CODEX EXECUTION LOG
                </span>
                <h2>任务诊断日志</h2>
                <small>{jobLog.id}</small>
              </div>
              <button onClick={() => setJobLog(null)}>
                <X size={16} />
              </button>
            </header>
            <div className={`job-log-status ${jobLog.status}`}>
              <strong>{jobLog.stage}</strong>
              <span>{new Date(jobLog.updatedAt).toLocaleString("zh-CN")}</span>
            </div>
            {jobLog.error && (
              <div className="job-log-error">
                <CircleX size={15} />
                <span>
                  <strong>失败原因</strong>
                  <p>{jobLog.error}</p>
                </span>
              </div>
            )}
            <pre>{jobLog.log}</pre>
            <footer>
              <span>日志只保存在本机工作目录，不会上传到其他服务。</span>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `${jobLog.error ? `${jobLog.error}\n\n` : ""}${jobLog.log}`,
                  );
                  notify("日志已复制到剪贴板");
                }}
              >
                <Copy size={13} />
                复制完整日志
              </button>
            </footer>
          </section>
        </div>
      )}
      {manifestPreviewUrl && (
        <div
          className="manifest-lightbox"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setManifestPreviewUrl(null);
          }}
        >
          <button
            className="manifest-lightbox-close"
            aria-label="关闭大图"
            onClick={() => setManifestPreviewUrl(null)}
          >
            <X size={20} />
          </button>
          <img src={manifestPreviewUrl} alt="素材生成结果大图" />
          <a href={manifestPreviewUrl} download>
            <Download size={15} />
            下载原始图片
          </a>
        </div>
      )}
      {toast && (
        <div className="toast">
          <CircleCheck size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}

function CustomStyleModal({
  close,
  onSaved,
}: {
  close: () => void;
  onSaved: (style: StylePreset) => void;
}) {
  const [nameHint, setNameHint] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState<GenerationSpec["reference"]>();
  const [draft, setDraft] = useState<StylePreset | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewStage, setPreviewStage] = useState("");
  const [previewProgress, setPreviewProgress] = useState(0);
  const [error, setError] = useState("");

  const updateDraft = <K extends keyof StylePreset>(
    key: K,
    value: StylePreset[K],
  ) => setDraft((current) => (current ? { ...current, [key]: value } : null));

  const uploadStyleReference = async (file?: File) => {
    if (!file || uploading) return;
    setUploading(true);
    setError("");
    try {
      const response = await fetch("/api/references", {
        method: "POST",
        headers: { "x-file-name": encodeURIComponent(file.name) },
        body: file,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "参考图上传失败");
      setReference(payload);
      setDraft(null);
      setPreviewUrl(null);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "参考图上传失败",
      );
    } finally {
      setUploading(false);
    }
  };

  const compileStyle = async () => {
    if (!description.trim() || compiling) {
      if (!description.trim()) setError("请先描述你想要的视觉风格");
      return;
    }
    setCompiling(true);
    setError("");
    setPreviewUrl(null);
    try {
      const response = await fetch("/api/styles/compile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: nameHint, description, reference }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Codex 整理风格失败");
      setDraft(payload);
    } catch (compileError) {
      setError(
        compileError instanceof Error
          ? compileError.message
          : "Codex 整理风格失败",
      );
    } finally {
      setCompiling(false);
    }
  };

  const generatePreview = async () => {
    if (!draft || generating) return;
    setGenerating(true);
    setPreviewUrl(null);
    setPreviewProgress(2);
    setPreviewStage("正在创建验证任务");
    setError("");
    try {
      const previewSpec: GenerationSpec = {
        prompt:
          draft.samplePrompt ||
          "生成一张标准游戏 UI 风格验证样张，包含主按钮、小面板和图标槽，不要文字",
        kind: "面板",
        gameGenre: "通用游戏",
        useCase: "自定义风格验证样张",
        states: ["默认"],
        elements: ["图标槽", "文字区域", "边框装饰"],
        engine: "Godot 4",
        style: draft.name,
        stylePrompt: draft.prompt,
        negativePrompt: [commonNegativePrompt, draft.negativePrompt]
          .filter(Boolean)
          .join(", "),
        reference,
        size: "1024 × 1024",
        variants: 1,
        transparent: false,
        styleLock: true,
      };
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spec: previewSpec }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "验证样张任务创建失败");
      const jobId = payload.id as string;
      for (;;) {
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
        const jobResponse = await fetch(`/api/jobs/${jobId}`);
        if (!jobResponse.ok) throw new Error("读取样张任务状态失败");
        const job: GenerationJob = await jobResponse.json();
        setPreviewProgress(job.progress);
        setPreviewStage(job.stage);
        if (job.status === "completed") {
          if (!job.outputUrls[0]) throw new Error("样张任务未输出图片");
          setPreviewUrl(job.outputUrls[0]);
          break;
        }
        if (["failed", "interrupted"].includes(job.status)) {
          throw new Error(job.error || "样张生成失败，请到生成记录查看日志");
        }
      }
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "验证样张生成失败",
      );
    } finally {
      setGenerating(false);
    }
  };

  const saveStyle = async () => {
    if (!draft || !previewUrl || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/styles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, description, previewUrl }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "保存自定义风格失败");
      onSaved(payload);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "保存自定义风格失败",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !generating) close();
      }}
    >
      <section className="custom-style-modal">
        <header>
          <div>
            <span className="eyebrow">
              <Palette size={13} /> CUSTOM STYLE LAB
            </span>
            <h2>创建自定义风格</h2>
            <p>中文描述 → Codex 整理 → 样张验证 → 确认保存</p>
          </div>
          <button onClick={close} disabled={generating} aria-label="关闭">
            <X size={16} />
          </button>
        </header>

        <div className="custom-style-body">
          <div className="custom-style-editor">
            <div className="custom-step-title">
              <b>1</b>
              <span>
                <strong>说明你想要的风格</strong>
                <small>可以描述颜色、材质、光照、线条或类似的游戏氛围</small>
              </span>
            </div>
            <label className="custom-style-name">
              <span>
                风格名称倾向 <small>可选</small>
              </span>
              <input
                value={nameHint}
                onChange={(event) => setNameHint(event.target.value)}
                placeholder="例如：星火铸造"
                maxLength={40}
              />
            </label>
            <label className="custom-style-description">
              <span>风格描述</span>
              <textarea
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setPreviewUrl(null);
                }}
                placeholder="例如：沉稳的手绘暗黑奇幻，粗线条和刀刻感边框，黑红金配色，像火光照在磨损黑铁上，装饰克制、轮廓要有力。"
                maxLength={1200}
              />
            </label>
            {reference ? (
              <div className="custom-reference-card">
                <img src={reference.url} alt={reference.name} />
                <span>
                  <small>风格参考图</small>
                  <strong>{reference.name}</strong>
                </span>
                <button
                  onClick={() => {
                    setReference(undefined);
                    setDraft(null);
                    setPreviewUrl(null);
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label className="custom-reference-drop">
                <Image size={18} />
                <span>
                  <strong>
                    {uploading ? "上传中…" : "添加风格参考图（可选）"}
                  </strong>
                  <small>Codex 会提取配色、材质和形状语言</small>
                </span>
                <input
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) =>
                    void uploadStyleReference(event.target.files?.[0])
                  }
                />
              </label>
            )}
            <button
              className="custom-primary-action"
              onClick={() => void compileStyle()}
              disabled={compiling || !description.trim()}
            >
              {compiling ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <WandSparkles size={15} />
              )}
              {compiling
                ? "Codex 正在整理风格 DNA…"
                : draft
                  ? "重新让 Codex 整理"
                  : "Codex 整理风格"}
            </button>

            {draft && (
              <div className="custom-draft">
                <div className="custom-step-title">
                  <b>2</b>
                  <span>
                    <strong>检查 Codex 整理结果</strong>
                    <small>名称和提示词都可以手动修改</small>
                  </span>
                </div>
                <div className="custom-draft-grid">
                  <label>
                    <span>风格名称</span>
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        updateDraft("name", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>特征摘要</span>
                    <input
                      value={draft.note}
                      onChange={(event) =>
                        updateDraft("note", event.target.value)
                      }
                    />
                  </label>
                </div>
                <label>
                  <span>适合用于</span>
                  <input
                    value={draft.bestFor}
                    onChange={(event) =>
                      updateDraft("bestFor", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>完整风格提示词</span>
                  <textarea
                    value={draft.prompt}
                    onChange={(event) => {
                      updateDraft("prompt", event.target.value);
                      setPreviewUrl(null);
                    }}
                  />
                </label>
                <div className="custom-colors">
                  <span>风格配色</span>
                  <div>
                    {draft.colors.map((color, index) => (
                      <label key={`${index}-${color}`} title={color}>
                        <input
                          type="color"
                          value={color}
                          onChange={(event) => {
                            const next = [...draft.colors];
                            next[index] = event.target.value;
                            updateDraft("colors", next);
                          }}
                        />
                        <small>{color}</small>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="custom-style-verifier">
            <div className="custom-step-title">
              <b>3</b>
              <span>
                <strong>生成验证样张</strong>
                <small>真实调用 Codex 图像生成，使用当前 ChatGPT 额度</small>
              </span>
            </div>
            <div
              className={`custom-style-preview ${previewUrl ? "ready" : ""}`}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={`${draft?.name || "自定义风格"}验证样张`}
                />
              ) : generating ? (
                <div className="custom-preview-progress">
                  <LoaderCircle className="spin" size={24} />
                  <strong>{previewStage || "Codex 正在生成样张"}</strong>
                  <div>
                    <i style={{ width: `${previewProgress}%` }} />
                  </div>
                  <small>{previewProgress}%</small>
                </div>
              ) : (
                <div className="custom-preview-empty">
                  <Palette size={30} />
                  <strong>这里会显示真实验证样张</strong>
                  <span>标准样张会同时测试按钮、面板和图标槽的风格一致性</span>
                </div>
              )}
            </div>
            {error && (
              <div className="custom-style-error">
                <CircleX size={14} />
                <span>{error}</span>
              </div>
            )}
            {!previewUrl ? (
              <button
                className="custom-preview-button"
                onClick={() => void generatePreview()}
                disabled={!draft || generating}
              >
                {generating ? (
                  <LoaderCircle className="spin" size={15} />
                ) : (
                  <Sparkles size={15} />
                )}
                {generating ? "样张生成中…" : "生成 1 张验证样张"}
              </button>
            ) : (
              <div className="custom-approval-actions">
                <button
                  onClick={() => {
                    setPreviewUrl(null);
                    setPreviewStage("");
                  }}
                >
                  <RefreshCcw size={14} />
                  不太像，继续调整
                </button>
                <button
                  className="approve"
                  onClick={() => void saveStyle()}
                  disabled={saving}
                >
                  {saving ? (
                    <LoaderCircle className="spin" size={14} />
                  ) : (
                    <CircleCheck size={14} />
                  )}
                  {saving ? "保存中…" : "符合预期，保存风格"}
                </button>
              </div>
            )}
            <div className="custom-verification-note">
              <LockKeyhole size={13} />
              <span>只有生成样张并由你确认后，风格才会进入“我的风格”。</span>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function StyleStudioPage({
  projects,
  activeProjectId,
  setActiveProjectId,
  updateProject,
  refreshProjects,
  onStyleSaved,
  notify,
}: {
  projects: StyleStudioProject[];
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  updateProject: (project: StyleStudioProject) => void;
  refreshProjects: () => Promise<void>;
  onStyleSaved: (style: StylePreset) => void;
  notify: (message: string) => void;
}) {
  const [showCreate, setShowCreate] = useState(!projects.length);
  const [projectName, setProjectName] = useState("");
  const [brief, setBrief] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [turnMode, setTurnMode] = useState<
    "refine" | "derive" | "branch"
  >("refine");
  const [sending, setSending] = useState(false);
  const [selectedReferenceUrl, setSelectedReferenceUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState("");
  const [generationJob, setGenerationJob] =
    useState<GenerationJob | null>(null);
  const [generationFailure, setGenerationFailure] =
    useState<GenerationFailureView | null>(null);
  const [generationClock, setGenerationClock] = useState(Date.now());
  const [cancellingGeneration, setCancellingGeneration] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const project =
    projects.find((item) => item.id === activeProjectId) || projects[0];
  const version =
    project?.versions.find(
      (item) => item.id === project.currentVersionId,
    ) || project?.versions.at(-1);

  useEffect(() => {
    if (projects.length) setShowCreate(false);
  }, [projects.length]);

  useEffect(() => {
    if (!generating) return;
    setGenerationClock(Date.now());
    const timer = window.setInterval(
      () => setGenerationClock(Date.now()),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [generating]);

  useEffect(() => {
    const jobId = version?.previewJobId;
    if (!jobId) {
      setGenerationJob(null);
      setGenerationFailure(null);
      setGenerating(false);
      return;
    }
    let disposed = false;
    let finished = false;
    let timer = 0;
    const poll = async () => {
      if (disposed || finished) return;
      try {
        const response = await fetch(`/api/jobs/${jobId}`, {
          signal: AbortSignal.timeout(8_000),
        });
        const currentJob: GenerationJob = await response.json();
        if (!response.ok)
          throw new Error(currentJob.error || "读取参考图生成进度失败");
        if (disposed) return;
        setGenerationJob(currentJob);
        setGenerationProgress(currentJob.progress);
        setGenerationStage(currentJob.stage);
        if (["queued", "running"].includes(currentJob.status)) {
          setGenerating(true);
          setGenerationFailure(null);
          return;
        }
        finished = true;
        window.clearInterval(timer);
        setGenerating(false);
        await refreshProjects();
        if (currentJob.status === "completed") {
          const visualOutputs = currentJob.outputUrls.filter(isVisualOutputUrl);
          if (visualOutputs[0]) setSelectedReferenceUrl(visualOutputs[0]);
          notify(
            visualOutputs.length
              ? `已生成 ${visualOutputs.length} 张风格参考图`
              : "任务已结束，但没有找到可用参考图",
          );
        } else {
          setGenerationFailure(
            describeGenerationFailure(
              currentJob.error || "参考图生成失败",
              currentJob,
            ),
          );
        }
      } catch (pollError) {
        if (disposed) return;
        setError(
          pollError instanceof Error
            ? pollError.message
            : "读取参考图任务失败",
        );
      }
    };
    void poll();
    timer = window.setInterval(() => void poll(), 1300);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [version?.previewJobId, refreshProjects, notify]);

  useEffect(() => {
    if (
      selectedReferenceUrl &&
      !project?.versions.some((item) =>
        item.previews.some((preview) => preview.url === selectedReferenceUrl),
      )
    ) {
      setSelectedReferenceUrl("");
    }
  }, [project?.id, selectedReferenceUrl]);

  const createProject = async () => {
    if (!brief.trim() || creating) {
      if (!brief.trim()) setError("请先写下你的风格脑暴想法");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const createResponse = await fetch("/api/style-projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: projectName.trim() || "新风格探索",
          brief,
        }),
      });
      const created = await createResponse.json();
      if (!createResponse.ok)
        throw new Error(created.error || "创建风格项目失败");
      updateProject(created);
      setActiveProjectId(created.id);
      const turnResponse = await fetch(
        `/api/style-projects/${created.id}/turn`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: brief,
            mode: "refine",
          }),
        },
      );
      const evolved = await turnResponse.json();
      if (!turnResponse.ok)
        throw new Error(evolved.error || "Codex 整理第一版风格失败");
      updateProject(evolved);
      setProjectName("");
      setBrief("");
      setShowCreate(false);
      notify("第一版风格 DNA 已生成，可以开始试图");
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "创建失败",
      );
    } finally {
      setCreating(false);
    }
  };

  const sendTurn = async () => {
    if (!project || !message.trim() || sending) return;
    if (turnMode === "derive" && !selectedReferenceUrl) {
      setError("请先从中间选择一张参考图，再基于图片衍生");
      return;
    }
    setSending(true);
    setError("");
    try {
      const response = await fetch(
        `/api/style-projects/${project.id}/turn`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message,
            mode: turnMode,
            baseVersionId: version?.id,
            referenceUrl: selectedReferenceUrl || undefined,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Codex 无法继续整理风格");
      updateProject(payload);
      setMessage("");
      setSelectedReferenceUrl("");
      setTurnMode("refine");
      notify(`已生成风格版本 ${payload.versions.length}`);
    } catch (turnError) {
      setError(
        turnError instanceof Error ? turnError.message : "风格对话失败",
      );
    } finally {
      setSending(false);
    }
  };

  const selectVersion = async (versionId: string) => {
    if (!project || versionId === project.currentVersionId) return;
    setError("");
    try {
      const response = await fetch(`/api/style-projects/${project.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "切换风格版本失败");
      updateProject(payload);
      setSelectedReferenceUrl("");
    } catch (versionError) {
      setError(
        versionError instanceof Error
          ? versionError.message
          : "切换版本失败",
      );
    }
  };

  const generateReferences = async () => {
    if (!project || !version || generating) return;
    setGenerating(true);
    setGenerationProgress(2);
    setGenerationStage("正在创建标准风格验证板");
    setGenerationJob(null);
    setGenerationFailure(null);
    setGenerationClock(Date.now());
    setError("");
    try {
      const reference = selectedReferenceUrl
        ? {
            name: "上一轮选中参考图",
            path: selectedReferenceUrl.replace(/^\/+/, ""),
            url: selectedReferenceUrl,
            source: "library" as const,
          }
        : undefined;
      const previewSpec: GenerationSpec = {
        prompt:
          version.dna.samplePrompt ||
          "生成无文字的标准游戏 UI 风格验证板，展示按钮、面板、边框、图标槽和图标",
        kind: "面板",
        gameGenre: "通用游戏",
        useCase: "风格工作室标准验证板",
        states: ["默认"],
        elements: ["图标槽", "文字区域", "边框装饰"],
        engine: "Godot 4",
        style: version.dna.name,
        stylePrompt: version.dna.prompt,
        negativePrompt: [
          commonNegativePrompt,
          version.dna.negativePrompt,
          "readable text, logo, full gameplay screenshot",
        ]
          .filter(Boolean)
          .join(", "),
        reference,
        size: "1024 × 1024",
        variants: 4,
        transparent: false,
        styleLock: true,
        studioMeta: {
          projectId: project.id,
          versionId: version.id,
        },
      };
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spec: previewSpec }),
      });
      const job: GenerationJob = await response.json();
      if (!response.ok)
        throw new Error(job.error || "无法创建风格参考图任务");
      setGenerationJob(job);
      setGenerationProgress(job.progress);
      setGenerationStage(job.stage);
      await refreshProjects();
    } catch (generationError) {
      const detail =
        generationError instanceof Error
          ? generationError.message
          : "参考图生成失败";
      setGenerationFailure(
        describeGenerationFailure(detail, generationJob),
      );
      setGenerating(false);
    }
  };

  const cancelReferenceGeneration = async () => {
    if (
      !generationJob ||
      !["queued", "running"].includes(generationJob.status) ||
      cancellingGeneration
    ) {
      return;
    }
    setCancellingGeneration(true);
    setError("");
    try {
      const response = await fetch(
        `/api/jobs/${generationJob.id}/cancel`,
        { method: "POST" },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "停止参考图任务失败");
      setGenerationJob(payload);
      setGenerationStage(payload.stage);
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "停止参考图任务失败",
      );
    } finally {
      setCancellingGeneration(false);
    }
  };

  const toggleAnchor = async (url: string) => {
    if (!project || !version) return;
    const current = version.anchorUrls || [];
    if (!current.includes(url) && current.length >= 2) {
      setError("最多只能选择 2 张最终锚点，请先取消一张已选图片");
      return;
    }
    const next = current.includes(url)
      ? current.filter((item) => item !== url)
      : [...current, url];
    setError("");
    try {
      const response = await fetch(`/api/style-projects/${project.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          versionId: version.id,
          anchorUrls: next,
        }),
      });
      const updated = await response.json();
      if (!response.ok)
        throw new Error(updated.error || "更新锚点图失败");
      updateProject(updated);
    } catch (anchorError) {
      setError(
        anchorError instanceof Error ? anchorError.message : "更新锚点失败",
      );
    }
  };

  const saveStyle = async () => {
    if (!project || !version || saving) return;
    if (!version.anchorUrls?.length) {
      setError("请先从参考图里选择 1～2 张作为最终锚点");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/style-projects/${project.id}/save`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            versionId: version.id,
            anchorUrls: version.anchorUrls,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "保存正式风格失败");
      updateProject(payload.project);
      onStyleSaved(payload.style);
      notify(`「${payload.style.name}」已进入风格库`);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "保存风格失败",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async () => {
    if (
      !project ||
      !window.confirm(`删除风格创作项目「${project.name}」？已保存风格不会删除。`)
    ) {
      return;
    }
    try {
      const response = await fetch(`/api/style-projects/${project.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "删除风格项目失败");
      setActiveProjectId(null);
      await refreshProjects();
      notify("已删除风格创作项目");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "删除失败",
      );
    }
  };

  const generationElapsed = formatTaskDuration(
    generationJob?.startedAt || generationJob?.createdAt,
    generationClock,
  );
  const generationLastActivity = new Date(
    generationJob?.lastActivityAt ||
      generationJob?.updatedAt ||
      generationJob?.createdAt ||
      generationClock,
  ).getTime();
  const generationQuietSeconds = Number.isFinite(generationLastActivity)
    ? Math.max(
        0,
        Math.floor((generationClock - generationLastActivity) / 1000),
      )
    : 0;
  const generationLooksStalled =
    generating &&
    generationJob?.status === "running" &&
    generationQuietSeconds >= 90;
  const studioBusy = creating || sending || generating;

  if (!project || showCreate) {
    return (
      <section className="style-studio-onboarding panel-surface">
        <div className="style-studio-onboarding-mark">
          <Palette size={38} />
        </div>
        <span className="eyebrow">STYLE DISCOVERY</span>
        <h2>先把脑暴想法交给 Codex</h2>
        <p>
          不需要专业提示词。描述题材、情绪、材质、颜色和你不喜欢的方向，Codex
          会先整理第一版风格 DNA，再进入持续对话和试图流程。
        </p>
        <label>
          <span>风格项目名称</span>
          <input
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="例如：玄金修仙像素风"
          />
        </label>
        <label>
          <span>初始脑暴</span>
          <textarea
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            placeholder="例如：想做精致的中国古代修仙像素风，玄黑与鎏金为主，搭配青玉和朱砂点缀；需要兼容按钮、面板、道具图标，不要廉价手游发光感……"
          />
        </label>
        {error && (
          <div className="style-studio-inline-error">
            <CircleX size={14} />
            {error}
          </div>
        )}
        <div className="style-studio-onboarding-actions">
          {projects.length ? (
            <button onClick={() => setShowCreate(false)}>返回已有项目</button>
          ) : null}
          <button
            className="primary"
            disabled={creating || !brief.trim()}
            onClick={() => void createProject()}
          >
            {creating ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <WandSparkles size={15} />
            )}
            {creating ? "Codex 正在整理第一版…" : "创建并整理第一版 DNA"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="style-studio-shell">
      <aside className="style-studio-conversation panel-surface">
        <div className="style-project-switcher">
          <div>
            <strong>风格项目</strong>
            <small>{projects.length} 个创作存档</small>
          </div>
          <button
            disabled={studioBusy}
            title={studioBusy ? "请先完成或停止当前任务" : undefined}
            onClick={() => setShowCreate(true)}
          >
            <Plus size={13} />
            新建
          </button>
        </div>
        <div className="style-project-tabs">
          {projects.map((item) => (
            <button
              key={item.id}
              className={item.id === project.id ? "active" : ""}
              disabled={studioBusy}
              title={studioBusy ? "请先完成或停止当前任务" : undefined}
              onClick={() => {
                setActiveProjectId(item.id);
                setSelectedReferenceUrl("");
                setError("");
              }}
            >
              <span>
                <strong>{item.name}</strong>
                <small>
                  {item.versions.length} 个版本
                  {item.status === "saved" ? " · 已保存" : " · 创作中"}
                </small>
              </span>
              <ChevronRight size={13} />
            </button>
          ))}
        </div>
        <div className="style-chat-head">
          <span>
            <Bot size={15} />
            <strong>Codex 美术总监</strong>
          </span>
          <button
            aria-label="删除当前风格项目"
            title={
              studioBusy ? "请先完成或停止当前任务" : "删除当前风格项目"
            }
            disabled={studioBusy}
            onClick={() => void deleteProject()}
          >
            <Trash2 size={12} />
          </button>
        </div>
        <div className="style-chat-messages">
          <div className="style-chat-brief">
            <strong>最初目标</strong>
            <p>{project.brief}</p>
          </div>
          {project.messages.map((item) => (
            <article className={item.role} key={item.id}>
              <div>{item.role === "assistant" ? <Bot /> : <User />}</div>
              <span>
                <small>{item.role === "assistant" ? "Codex" : "你"}</small>
                <p>{item.content}</p>
                {item.referenceUrl ? (
                  <img src={item.referenceUrl} alt="本轮参考图" />
                ) : null}
              </span>
            </article>
          ))}
          {(sending || creating) && (
            <article className="assistant thinking">
              <div>
                <LoaderCircle className="spin" />
              </div>
              <span>
                <small>Codex</small>
                <p>正在压缩当前 DNA、理解取舍并整理新版本…</p>
              </span>
            </article>
          )}
        </div>
        <div className="style-turn-modes">
          <button
            className={turnMode === "refine" ? "active" : ""}
            disabled={studioBusy}
            onClick={() => setTurnMode("refine")}
          >
            继续调整
          </button>
          <button
            className={turnMode === "derive" ? "active" : ""}
            onClick={() => setTurnMode("derive")}
            disabled={!selectedReferenceUrl || studioBusy}
            title={
              studioBusy
                ? "请先完成或停止当前任务"
                : selectedReferenceUrl
                ? "使用选中图片作为视觉证据"
                : "先在中间选择一张参考图"
            }
          >
            基于图衍生
          </button>
          <button
            className={turnMode === "branch" ? "active" : ""}
            disabled={studioBusy}
            onClick={() => setTurnMode("branch")}
          >
            新方向分支
          </button>
        </div>
        {selectedReferenceUrl ? (
          <div className="style-chat-reference">
            <img src={selectedReferenceUrl} alt="对话参考图" />
            <span>
              <strong>本轮会参考这张图</strong>
              <small>点击中间其他图片可切换</small>
            </span>
            <button
              aria-label="移除本轮参考图"
              title="移除本轮参考图"
              disabled={studioBusy}
              onClick={() => setSelectedReferenceUrl("")}
            >
              <X size={12} />
            </button>
          </div>
        ) : null}
        <div className="style-chat-composer">
          <textarea
            disabled={generating}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={
              turnMode === "branch"
                ? "描述想尝试的新方向，例如：保留像素精度，但把宫廷金属感改成山水青绿……"
                : "告诉 Codex 哪些满意、哪些需要调整……"
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                (event.metaKey || event.ctrlKey)
              ) {
                event.preventDefault();
                void sendTurn();
              }
            }}
          />
          <button
            aria-label={sending ? "正在整理风格" : "发送风格调整"}
            title="发送风格调整（⌘/Ctrl + Enter）"
            disabled={!message.trim() || studioBusy}
            onClick={() => void sendTurn()}
          >
            {sending ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>
      </aside>

      <main className="style-studio-canvas panel-surface">
        <div className="style-version-head">
          <span>
            <strong>风格版本与参考图</strong>
            <small>点击图片作为下一轮对话参考；最多选择两张最终锚点</small>
          </span>
          <button
            disabled={!version || generating}
            onClick={() => void generateReferences()}
          >
            {generating ? (
              <LoaderCircle className="spin" size={14} />
            ) : (
              <ImagePlus size={14} />
            )}
            {generating ? "正在生成参考图" : "生成 4 个参考方案"}
          </button>
        </div>
        <div className="style-version-strip">
          {project.versions.map((item, index) => (
            <button
              key={item.id}
              className={item.id === version?.id ? "active" : ""}
              disabled={studioBusy}
              title={studioBusy ? "请先完成或停止当前任务" : undefined}
              onClick={() => void selectVersion(item.id)}
            >
              <b>V{index + 1}</b>
              <span>
                <strong>{item.dna.name}</strong>
                <small>{item.label}</small>
              </span>
              {item.mode === "branch" ? <GitBranch size={12} /> : null}
            </button>
          ))}
        </div>
        {generating ? (
          <div className="style-generation-progress">
            <LoaderCircle className="spin" size={28} />
            <strong>
              {version
                ? `正在为 V${project.versions.indexOf(version) + 1}「${version.dna.name}」生成参考图`
                : "正在生成风格参考图"}
            </strong>
            <span className="style-generation-stage">
              {generationStage || "Codex 正在生成参考方案"}
            </span>
            <div>
              <i style={{ width: `${generationProgress}%` }} />
            </div>
            <small>
              {generationProgress}% · 已执行 {generationElapsed || "0秒"} ·
              这一步使用当前 ChatGPT 额度
            </small>
            {generationJob?.warning || generationLooksStalled ? (
              <div className="style-generation-warning">
                <TriangleAlert size={15} />
                <span>
                  <b>
                    {generationJob?.warning
                      ? "检测到图片生成异常"
                      : "长时间没有收到新进度"}
                  </b>
                  <small>
                    {generationJob?.warning ||
                      `已 ${formatTaskDuration(
                        generationJob?.lastActivityAt ||
                          generationJob?.updatedAt,
                        generationClock,
                      )} 没有新消息。任务仍在后台运行，网络较慢时可能需要继续等待；若最终失败，原因会直接显示在这里。`}
                  </small>
                </span>
              </div>
            ) : null}
            <button
              className="style-generation-cancel"
              disabled={cancellingGeneration}
              onClick={() => void cancelReferenceGeneration()}
            >
              {cancellingGeneration ? (
                <LoaderCircle className="spin" size={13} />
              ) : (
                <Square size={13} />
              )}
              {cancellingGeneration ? "正在停止…" : "停止本次生成"}
            </button>
          </div>
        ) : generationFailure && !version?.previews.length ? (
          <div className="style-generation-failure">
            <span className="style-generation-failure-icon">
              <CircleX size={24} />
            </span>
            <strong>{generationFailure.title}</strong>
            <p>{generationFailure.message}</p>
            <small>
              {generationFailure.elapsed
                ? `执行 ${generationFailure.elapsed}`
                : "任务未完成"}
              {generationFailure.jobId
                ? ` · 任务 ${generationFailure.jobId.slice(0, 8)}`
                : ""}
            </small>
            <details>
              <summary>查看技术详情</summary>
              <pre>{generationFailure.detail}</pre>
            </details>
            <button onClick={() => void generateReferences()}>
              <RefreshCcw size={14} />
              重新生成 4 个参考方案
            </button>
          </div>
        ) : version?.previews.length ? (
          <div className="style-preview-results">
            {generationFailure ? (
              <div className="style-generation-partial-note">
                <TriangleAlert size={16} />
                <span>
                  <strong>
                    上一次未完成，已保留 {version.previews.length} 张结果
                  </strong>
                  <small>
                    {generationFailure.message}
                    {generationFailure.elapsed
                      ? ` · 已执行 ${generationFailure.elapsed}`
                      : ""}
                  </small>
                </span>
                <button onClick={() => void generateReferences()}>
                  <RefreshCcw size={13} />
                  再生成一轮
                </button>
              </div>
            ) : null}
            <div className="style-preview-grid">
              {version.previews.map((preview, index) => {
                const isAnchor = version.anchorUrls?.includes(preview.url);
                const isReference = selectedReferenceUrl === preview.url;
                const anchorLimitReached =
                  !isAnchor && (version.anchorUrls?.length || 0) >= 2;
                return (
                  <article
                    key={preview.url}
                    className={`${isAnchor ? "anchor" : ""} ${
                      isReference ? "reference" : ""
                    }`}
                  >
                    <button
                      className="style-preview-image"
                      onClick={() => setSelectedReferenceUrl(preview.url)}
                    >
                      <img
                        src={preview.url}
                        alt={`${version.dna.name}参考方案 ${index + 1}`}
                      />
                      {isReference ? <span>对话参考</span> : null}
                    </button>
                    <footer>
                      <span>
                        <strong>方案 {index + 1}</strong>
                        <small>
                          {isAnchor
                            ? "已选为最终锚点"
                            : "点击图片继续对话"}
                        </small>
                      </span>
                      <button
                        className={`${isAnchor ? "selected" : ""} ${
                          anchorLimitReached ? "limit-reached" : ""
                        }`}
                        title={
                          anchorLimitReached
                            ? "最多两张，请先取消一张已选锚点"
                            : undefined
                        }
                        onClick={() => void toggleAnchor(preview.url)}
                      >
                        {isAnchor ? <Check size={12} /> : <Plus size={12} />}
                        {isAnchor
                          ? "已选"
                          : anchorLimitReached
                            ? "已满，先取消"
                            : "选为锚点"}
                      </button>
                    </footer>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="style-preview-empty">
            <ImagePlus size={34} />
            <strong>这版还没有参考图</strong>
            <p>
              生成标准验证板后，可以挑选满意方案继续对话，或选1～2张保存为风格锚点。
            </p>
            <button
              disabled={!version}
              onClick={() => void generateReferences()}
            >
              <Sparkles size={14} />
              生成第一轮参考方案
            </button>
          </div>
        )}
        {error ? (
          <div className="style-studio-inline-error canvas-error">
            <CircleX size={14} />
            {error}
          </div>
        ) : null}
        <div className="style-anchor-bar">
          <span>
            <strong>最终风格锚点</strong>
            <small>
              {version?.anchorUrls?.length || 0}/2 ·
              建议一张UI组件板、一张图标板
            </small>
          </span>
          <div>
            {[0, 1].map((index) =>
              version?.anchorUrls?.[index] ? (
                <img
                  key={version.anchorUrls[index]}
                  src={version.anchorUrls[index]}
                  alt={`锚点 ${index + 1}`}
                />
              ) : (
                <i key={index}>
                  <Plus size={13} />
                </i>
              ),
            )}
          </div>
          <button
            disabled={!version?.anchorUrls?.length || saving}
            onClick={() => void saveStyle()}
          >
            {saving ? (
              <LoaderCircle className="spin" size={14} />
            ) : (
              <Save size={14} />
            )}
            {project.status === "saved" ? "更新正式风格" : "保存为正式风格"}
          </button>
        </div>
      </main>

      <aside className="style-studio-dna panel-surface">
        <div className="style-dna-head">
          <span>
            <strong>当前风格 DNA</strong>
            <small>{version ? `V${project.versions.indexOf(version) + 1}` : "等待整理"}</small>
          </span>
          {project.status === "saved" ? <b>已进入风格库</b> : <b>草稿</b>}
        </div>
        {version ? (
          <>
            <div className="style-dna-name">
              <span>
                <small>{version.dna.category}</small>
                <strong>{version.dna.name}</strong>
                <em>{version.dna.note}</em>
              </span>
              <div>
                {version.dna.colors.map((color) => (
                  <i key={color} style={{ background: color }} title={color} />
                ))}
              </div>
            </div>
            <div className="style-dna-section">
              <strong>适用范围</strong>
              <p>{version.dna.bestFor}</p>
            </div>
            <div className="style-dna-section prompt">
              <strong>完整风格提示词</strong>
              <textarea readOnly value={version.dna.prompt} />
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(version.dna.prompt);
                  notify("风格 DNA 已复制");
                }}
              >
                <Copy size={12} />
                复制
              </button>
            </div>
            <div className="style-dna-section">
              <strong>排除词</strong>
              <p>{version.dna.negativePrompt}</p>
            </div>
            <div className="style-dna-section">
              <strong>标准验证板规格</strong>
              <p>{version.dna.samplePrompt}</p>
            </div>
            <div className="style-dna-provenance">
              <LockKeyhole size={14} />
              <span>
                <strong>每轮都保存独立版本</strong>
                <small>
                  批量生成读取最终 DNA，不依赖这段长对话继续存在。
                </small>
              </span>
            </div>
          </>
        ) : (
          <EmptyState
            icon={<Palette />}
            title="等待第一版 DNA"
            text="Codex 整理完成后会显示结构化风格规则"
          />
        )}
      </aside>
    </section>
  );
}

function Inspector({
  asset,
  onPreview,
  onRedraw,
  onExport,
  onEdit,
}: {
  asset?: GeneratedAsset;
  onPreview: () => void;
  onRedraw: () => void;
  onExport: () => void;
  onEdit: () => void;
}) {
  if (!asset)
    return (
      <EmptyState
        icon={<Image />}
        title="未选择素材"
        text="从素材库选择一个素材查看详情"
      />
    );
  return (
    <>
      <div className="inspector-title">
        <div>
          <Eye size={16} />
          <strong>设计检查器</strong>
        </div>
        <button onClick={onPreview}>•••</button>
      </div>
      <AssetPreview asset={asset} large />
      <div className="selection-title">
        <span>
          <small>
            {asset.kind} · {asset.style}
          </small>
          <strong>{asset.name}</strong>
        </span>
        <button onClick={onPreview}>
          <Maximize2 size={15} />
        </button>
      </div>
      <div className="quality-card">
        <div
          className="score-ring"
          style={{ "--score": `${asset.score * 3.6}deg` } as CSSProperties}
        >
          <span>
            <strong>{asset.score || "—"}</strong>
            <small>质量分</small>
          </span>
        </div>
        <div className="quality-list">
          <span>
            <Check size={12} />
            轮廓完整
          </span>
          <span>
            <Check size={12} />
            透明边缘
          </span>
          <span>
            <Check size={12} />
            风格一致
          </span>
          <span>
            <Check size={12} />
            安全区通过
          </span>
        </div>
      </div>
      <div className="inspector-section">
        <div className="inspector-section-title">
          <strong>风格 DNA</strong>
          <span>
            <LockKeyhole size={12} />
            已锁定
          </span>
        </div>
        <div className="palette-row">
          {asset.palette.map((color) => (
            <button
              key={color}
              style={{ background: color }}
              title={color}
              onClick={() => navigator.clipboard?.writeText(color)}
            />
          ))}
        </div>
        <dl>
          <div>
            <dt>边框语言</dt>
            <dd>层级清晰 · 柔和倒角</dd>
          </div>
          <div>
            <dt>光源</dt>
            <dd>左上 35° · 主体高光</dd>
          </div>
          <div>
            <dt>细节密度</dt>
            <dd>中等 · 焦点清晰</dd>
          </div>
        </dl>
      </div>
      <div className="inspector-section">
        <div className="inspector-section-title">
          <strong>导出配置</strong>
          <button onClick={onEdit}>编辑</button>
        </div>
        <div className="export-tags">
          <span>PNG</span>
          <span>2×</span>
          <span>透明</span>
          <span>9-Slice</span>
        </div>
      </div>
      <div className="inspector-actions">
        <button onClick={onRedraw}>
          <RefreshCcw size={15} />
          基于此图重绘
        </button>
        <button className="accent" onClick={onExport}>
          <Download size={15} />
          导出素材
        </button>
      </div>
    </>
  );
}

function Modal({
  type,
  page,
  close,
  health,
  assets,
  selected,
  chooseAsset,
  chooseStyle,
  styles,
  openCustomStyle,
  deleteStyle,
}: {
  type: "flow" | "search" | "styles" | "preview" | "settings";
  page: WorkspacePage;
  close: () => void;
  health: BackendHealth | null;
  assets: GeneratedAsset[];
  selected?: GeneratedAsset;
  chooseAsset: (id: string) => void;
  chooseStyle: (style: string) => void;
  styles: StylePreset[];
  openCustomStyle: () => void;
  deleteStyle: (style: StylePreset) => void;
}) {
  const [query, setQuery] = useState("");
  const [resourceTab, setResourceTab] = useState<
    "styles" | "assets" | "models"
  >("styles");
  const matches = assets.filter((asset) =>
    `${asset.name}${asset.kind}${asset.style}`.includes(query),
  );
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section className={`modal-card modal-${type}`}>
        <button
          className="modal-close"
          aria-label="关闭弹窗"
          title="关闭"
          onClick={close}
        >
          <X size={17} />
        </button>
        {type === "flow" && (
          <>
            <span className="eyebrow">
              <Play size={13} /> AUTOMATION FLOW
            </span>
            <h2>
              {page === "style-studio"
                ? "一种风格如何从想法变成可复用资产"
                : "一次生成会发生什么"}
            </h2>
            <div className="flow-list">
              {(page === "style-studio"
                ? [
                    [
                      "01",
                      "说出脑暴想法",
                      "只需描述题材、情绪、材质、颜色和不喜欢的方向，不必自己写专业提示词",
                    ],
                    [
                      "02",
                      "Codex 整理风格 DNA",
                      "把对话压缩成可复用的配色、材质、线条、边框、细节密度和排除词",
                    ],
                    [
                      "03",
                      "持续调整或创建分支",
                      "每轮对话都会保存独立版本，可以回看旧方向，也可以从满意版本继续衍生",
                    ],
                    [
                      "04",
                      "生成标准参考方案",
                      "使用统一验证板检查按钮、面板、边框和图标是否属于同一种视觉语言",
                    ],
                    [
                      "05",
                      "选择锚点并正式保存",
                      "选 1～2 张参考图和最终 DNA 进入风格库，之后创作台和批量任务都可复用",
                    ],
                  ]
                : [
                    [
                      "01",
                      "提交规格",
                      "界面将提示词、风格、尺寸和变体数量传给本地服务",
                    ],
                    [
                      "02",
                      "启动 Codex CLI",
                      "复用你当前的 ChatGPT 登录，在项目沙箱内运行 codex exec",
                    ],
                    [
                      "03",
                      "调用 imagegen",
                      "Codex 按系统技能生成图片；透明素材会执行色键抠图流程",
                    ],
                    [
                      "04",
                      "保存与质检",
                      "最终图片写入 outputs/任务ID，并生成 manifest.json",
                    ],
                    [
                      "05",
                      "进入素材库",
                      "结果自动回填到工作台，可继续九宫格、图集和引擎导出",
                    ],
                  ]
              ).map(([number, title, text]) => (
                <div key={number}>
                  <b>{number}</b>
                  <span>
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        {type === "search" && (
          <>
            <span className="eyebrow">
              <Search size={13} /> QUICK FIND
            </span>
            <h2>搜索素材</h2>
            <label className="modal-search">
              <Search size={17} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="输入名称、类型或风格…"
              />
            </label>
            <div className="search-results">
              {matches.slice(0, 8).map((asset) => (
                <button key={asset.id} onClick={() => chooseAsset(asset.id)}>
                  <span style={cssVars(asset)}>
                    <AssetPreview asset={asset} />
                  </span>
                  <div>
                    <strong>{asset.name}</strong>
                    <small>
                      {asset.kind} · {asset.style}
                    </small>
                  </div>
                  <Maximize2 size={14} />
                </button>
              ))}
            </div>
          </>
        )}
        {type === "styles" && (
          <>
            <span className="eyebrow">
              <Sparkles size={13} /> OPEN RESOURCE HUB
            </span>
            <h2>开源资源中心</h2>
            <p className="modal-intro">
              风格提示词会真实注入 Codex
              任务；外部素材与模型保留原始许可证信息。
            </p>
            <div className="resource-tabs">
              <button
                className={resourceTab === "styles" ? "active" : ""}
                onClick={() => setResourceTab("styles")}
              >
                <Palette size={14} />
                风格预设 <b>{styles.length}</b>
              </button>
              <button
                className={resourceTab === "assets" ? "active" : ""}
                onClick={() => setResourceTab("assets")}
              >
                <Database size={14} />
                素材来源 <b>{assetSources.length}</b>
              </button>
              <button
                className={resourceTab === "models" ? "active" : ""}
                onClick={() => setResourceTab("models")}
              >
                <Cpu size={14} />
                本地模型 <b>{modelPresets.length}</b>
              </button>
            </div>
            {resourceTab === "styles" && (
              <div className="style-modal-grid resource-style-grid">
                <button className="style-add" onClick={openCustomStyle}>
                  <CirclePlus size={28} />
                  <strong>创建自定义风格</strong>
                  <span>Codex 整理 · 生成样张 · 确认保存</span>
                </button>
                {styles.map((style, index) => (
                  <article className="resource-style-card" key={style.id}>
                    <button onClick={() => chooseStyle(style.name)}>
                      <div
                        className="style-hero style-reference-thumb"
                        style={styleThumb(style, index)}
                      >
                        <b>{style.custom ? "我的风格" : style.category}</b>
                      </div>
                      <strong>{style.name}</strong>
                      <span>{style.note}</span>
                      <small>{style.bestFor}</small>
                    </button>
                    {style.custom && (
                      <button
                        className="delete-custom-style"
                        aria-label={`删除${style.name}`}
                        onClick={() => deleteStyle(style)}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
            {resourceTab === "assets" && (
              <div className="resource-source-list">
                {assetSources.map((source) => (
                  <article key={source.id}>
                    <div
                      className="resource-source-mark"
                      style={{
                        background: `linear-gradient(135deg, ${source.colors.join(",")})`,
                      }}
                    >
                      <Database size={18} />
                    </div>
                    <div>
                      <strong>{source.name}</strong>
                      <span>{source.description}</span>
                      <small>
                        {source.count} · {source.format}
                      </small>
                    </div>
                    <b className={source.licenseTone}>{source.license}</b>
                    <button
                      onClick={() =>
                        window.open(source.url, "_blank", "noopener,noreferrer")
                      }
                    >
                      <ExternalLink size={14} />
                      打开
                    </button>
                  </article>
                ))}
              </div>
            )}
            {resourceTab === "models" && (
              <div className="model-catalog">
                {modelPresets.map((model) => (
                  <article key={model.id}>
                    <div className="model-icon">
                      <Cpu size={18} />
                    </div>
                    <div className="model-main">
                      <span>
                        <strong>{model.name}</strong>
                        <b>{model.family}</b>
                      </span>
                      <p>{model.description}</p>
                      <div>
                        {model.bestFor.map((item) => (
                          <small key={item}>{item}</small>
                        ))}
                      </div>
                      {model.warning && <em>{model.warning}</em>}
                    </div>
                    <dl>
                      <div>
                        <dt>许可</dt>
                        <dd>{model.license}</dd>
                      </div>
                      <div>
                        <dt>体积</dt>
                        <dd>{model.size}</dd>
                      </div>
                      <div>
                        <dt>硬件</dt>
                        <dd>{model.hardware}</dd>
                      </div>
                    </dl>
                    <button
                      onClick={() =>
                        window.open(model.url, "_blank", "noopener,noreferrer")
                      }
                    >
                      <ExternalLink size={14} />
                      模型页
                    </button>
                  </article>
                ))}
                <div className="model-note">
                  <SquareTerminal size={15} />
                  <span>
                    <strong>当前默认仍使用 Codex</strong>
                    <small>
                      模型目录用于后续接入 ComfyUI；未安装模型不会影响现有 Codex
                      生成。
                    </small>
                  </span>
                </div>
              </div>
            )}
          </>
        )}
        {type === "preview" && selected && (
          <>
            <span className="eyebrow">
              <Eye size={13} /> ASSET PREVIEW
            </span>
            <h2>{selected.name}</h2>
            <div className="modal-preview">
              <AssetPreview asset={selected} large />
            </div>
            <div className="preview-meta">
              <span>
                <strong>{selected.kind}</strong>
                <small>组件类型</small>
              </span>
              <span>
                <strong>{selected.style}</strong>
                <small>视觉风格</small>
              </span>
              <span>
                <strong>{selected.score || "—"}</strong>
                <small>质量分</small>
              </span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(
                    selected.imageUrl || selected.id,
                  );
                }}
              >
                <Copy size={14} />
                复制资源标识
              </button>
            </div>
          </>
        )}
        {type === "settings" && (
          <>
            <span className="eyebrow">
              <SquareTerminal size={13} /> LOCAL BACKEND
            </span>
            <h2>Codex 本地连接</h2>
            <div
              className={`connection-card ${health?.ok ? "online" : "offline"}`}
            >
              <div>
                <span className="status-dot" />
                <strong>{health?.ok ? "连接正常" : "尚未连接"}</strong>
              </div>
              <p>
                {health?.codex.login ||
                  "请先启动 npm run dev，并确认 codex login status 正常。"}
              </p>
            </div>
            <div
              className={`connection-card comfy-connection ${health?.comfyui?.available ? "online" : "offline"}`}
            >
              <div>
                <span className="status-dot" />
                <strong>
                  ComfyUI ·{" "}
                  {health?.comfyui?.available ? "已检测到" : "可选后端"}
                </strong>
              </div>
              <p>
                {health?.comfyui?.status || "正在检测 127.0.0.1:8188"} ·{" "}
                {health?.comfyui?.url || "http://127.0.0.1:8188"}
              </p>
            </div>
            <dl className="backend-details">
              <div>
                <dt>CLI 版本</dt>
                <dd>{health?.codex.version || "未检测"}</dd>
              </div>
              <div>
                <dt>认证方式</dt>
                <dd>
                  {health?.codex.authenticated ? "ChatGPT 登录" : "未登录"}
                </dd>
              </div>
              <div>
                <dt>工作目录</dt>
                <dd>{health?.workspace || "—"}</dd>
              </div>
              <div>
                <dt>沙箱</dt>
                <dd>workspace-write</dd>
              </div>
              <div>
                <dt>接口地址</dt>
                <dd>127.0.0.1:4319</dd>
              </div>
            </dl>
            <button
              className="secondary-button backend-resource-button"
              onClick={() =>
                window.open(
                  "https://docs.comfy.org/tutorials/image/z-image/z-image",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <ExternalLink size={14} />
              查看 ComfyUI 官方模型工作流
            </button>
            <div className="security-note">
              <LockKeyhole size={16} />
              <span>
                <strong>仅本机可访问</strong>
                <small>
                  服务只监听
                  127.0.0.1，不读取或显示你的登录凭据，也不接受任意命令和工作目录。
                </small>
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default App;
