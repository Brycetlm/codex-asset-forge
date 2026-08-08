import { app, BrowserWindow, dialog, Menu, shell } from "electron";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let mainWindow = null;
let runtimeUrl = null;
let closeServer = null;

function findCodex() {
  const candidates = [
    process.env.CODEX_BIN,
    "/Applications/ChatGPT.app/Contents/Resources/codex",
    path.join(app.getPath("home"), ".local", "bin", "codex"),
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) || "codex";
}

function copyStarterWorkspace(workspace) {
  if (!app.isPackaged) return;
  const starter = path.join(process.resourcesPath, "starter");
  for (const name of ["data", "outputs", path.join("library", "imports")]) {
    const source = path.join(starter, name);
    const destination = path.join(workspace, name);
    if (existsSync(source) && !existsSync(destination)) {
      mkdirSync(path.dirname(destination), { recursive: true });
      cpSync(source, destination, { recursive: true });
    }
  }
}

function installMenu(workspace) {
  const template = [
    {
      label: "UI Forge",
      submenu: [
        { role: "about", label: "关于 UI Forge" },
        { type: "separator" },
        {
          label: "打开素材工作目录",
          click: () => void shell.openPath(workspace),
        },
        { type: "separator" },
        { role: "hide", label: "隐藏 UI Forge" },
        { role: "hideOthers", label: "隐藏其他" },
        { role: "unhide", label: "全部显示" },
        { type: "separator" },
        { role: "quit", label: "退出 UI Forge" },
      ],
    },
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" },
      ],
    },
    {
      label: "显示",
      submenu: [
        { role: "reload", label: "重新载入" },
        { role: "togglefullscreen", label: "切换全屏" },
      ],
    },
    { role: "windowMenu", label: "窗口" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  if (!runtimeUrl) return;
  mainWindow = new BrowserWindow({
    title: "UI Forge · 游戏界面素材工厂",
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    backgroundColor: "#0b0b0f",
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  await mainWindow.loadURL(runtimeUrl);
}

async function start() {
  const workspace = app.isPackaged
    ? path.join(app.getPath("userData"), "workspace")
    : projectRoot;
  mkdirSync(workspace, { recursive: true });
  copyStarterWorkspace(workspace);
  installMenu(workspace);

  process.env.CODEX_BIN = findCodex();
  process.env.UI_FORGE_API_PORT = "0";
  process.env.UI_FORGE_DESKTOP = "1";
  process.env.UI_FORGE_WORKSPACE_DIR = workspace;
  process.env.UI_FORGE_STATIC_DIR = path.join(
    app.isPackaged ? app.getAppPath() : projectRoot,
    "dist",
  );

  const serverPath = path.join(
    app.isPackaged ? app.getAppPath() : projectRoot,
    "server",
    "index.mjs",
  );
  const serverModule = await import(pathToFileURL(serverPath).href);
  const runtime = await serverModule.ready;
  closeServer = serverModule.closeServer;
  runtimeUrl = `http://${runtime.host}:${runtime.port}/`;
  await createWindow();
}

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(start).catch((error) => {
    dialog.showErrorBox(
      "UI Forge 启动失败",
      error instanceof Error ? error.stack || error.message : String(error),
    );
    app.quit();
  });
}

app.on("activate", () => {
  if (!mainWindow) void createWindow();
});

app.on("window-all-closed", () => app.quit());

app.on("before-quit", () => {
  if (closeServer) void closeServer();
});
