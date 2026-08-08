export type AssetKind = "按钮" | "面板" | "图标" | "HUD" | "背包" | "弹窗";

export type AssetStatus = "ready" | "generating" | "queued" | "failed";

export interface GeneratedAsset {
  id: string;
  name: string;
  kind: AssetKind;
  style: string;
  status: AssetStatus;
  score: number;
  palette: string[];
  variant: number;
  imageUrl?: string;
  jobId?: string;
  createdAt?: string;
}

export interface GenerationSpec {
  prompt: string;
  kind: AssetKind;
  gameGenre: string;
  useCase: string;
  states: string[];
  elements: string[];
  engine: string;
  style: string;
  stylePrompt?: string;
  negativePrompt?: string;
  reference?: {
    name: string;
    path: string;
    url: string;
    source: "upload" | "library";
    width?: number;
    height?: number;
    bytes?: number;
    mimeType?: string;
  };
  size: string;
  variants: number;
  transparent: boolean;
  styleLock: boolean;
  taskMeta?: {
    manifestId: string;
    taskId: string;
    assetId: string;
    fileName: string;
    runtimePath: string;
  };
  studioMeta?: {
    projectId: string;
    versionId: string;
  };
}

export type WorkspacePage =
  | "creator"
  | "style-studio"
  | "manifest"
  | "library"
  | "kits"
  | "history"
  | "split-sheet"
  | "nine-slice"
  | "atlas"
  | "export";

export type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "interrupted";

export interface GenerationJob {
  id: string;
  status: JobStatus;
  progress: number;
  stage: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  lastActivityAt?: string;
  spec: GenerationSpec;
  outputUrls: string[];
  error?: string;
  errorDetail?: string;
  warning?: string;
  codexVersion?: string;
}

export interface BackendHealth {
  ok: boolean;
  codex: {
    available: boolean;
    authenticated: boolean;
    version: string;
    login: string;
  };
  comfyui?: {
    available: boolean;
    url: string;
    status: string;
  };
  workspace: string;
}
