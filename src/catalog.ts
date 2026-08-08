export interface StylePreset {
  id: string;
  name: string;
  note: string;
  category: "奇幻" | "科幻" | "像素" | "休闲" | "东方";
  colors: string[];
  prompt: string;
  bestFor: string;
  negativePrompt?: string;
  samplePrompt?: string;
  description?: string;
  previewUrl?: string | null;
  anchorUrls?: string[];
  studioProjectId?: string;
  studioVersionId?: string;
  custom?: boolean;
  createdAt?: string;
}

export interface AssetSource {
  id: string;
  name: string;
  description: string;
  license: string;
  licenseTone: "free" | "credit";
  count: string;
  format: string;
  tags: string[];
  url: string;
  colors: string[];
}

export interface ModelPreset {
  id: string;
  name: string;
  family: string;
  description: string;
  license: string;
  size: string;
  hardware: string;
  bestFor: string[];
  url: string;
  comfy: boolean;
  warning?: string;
}

export const commonNegativePrompt =
  "device mockup, gameplay screenshot, background scene, watermark, logo, hands, perspective distortion, photorealism, illegible text, cropped edges, inconsistent border thickness, duplicate ornaments";

export const stylePresets: StylePreset[] = [
  {
    id: "forest-fantasy",
    name: "森语幻想",
    note: "温暖 · 手绘 · 自然",
    category: "奇幻",
    colors: ["#f0cd84", "#cf8554", "#5c7d67", "#24332d"],
    bestFor: "冒险菜单、任务面板、自然系图标",
    prompt:
      "hand-painted fantasy game UI, carved warm oak, moss and ivy ornaments, aged brass corners, soft golden rim light, natural green and amber palette, tactile painterly materials",
  },
  {
    id: "neon-frontier",
    name: "霓虹边界",
    note: "锐利 · 科幻 · 高对比",
    category: "科幻",
    colors: ["#6fe8f1", "#7557e5", "#f653ae", "#10142b"],
    bestFor: "HUD、技能面板、赛博朋克菜单",
    prompt:
      "futuristic sci-fi HUD, translucent dark glass, cyan and magenta neon lines, holographic highlights, sharp geometric corners, high contrast, precise technical detailing",
  },
  {
    id: "pixel-caravan",
    name: "像素旅团",
    note: "16-bit · 明快 · 冒险",
    category: "像素",
    colors: ["#f5d477", "#e77f59", "#4d7164", "#202b33"],
    bestFor: "像素 RPG、物品栏、角色状态",
    prompt:
      "16-bit pixel art game UI, crisp pixel grid, limited warm palette, chunky readable borders, no antialiasing, classic adventure game style, deliberate one-pixel highlights",
  },
  {
    id: "obsidian-court",
    name: "曜石王庭",
    note: "暗黑 · 金属 · 史诗",
    category: "奇幻",
    colors: ["#e1bd71", "#795143", "#363944", "#111117"],
    bestFor: "暗黑 RPG、Boss 面板、装备 UI",
    prompt:
      "dark gothic game UI, polished black obsidian, engraved gold filigree, deep crimson gemstone accents, dramatic top lighting, royal and solemn, dense but readable ornamentation",
  },
  {
    id: "parchment-chronicle",
    name: "羊皮卷史诗",
    note: "中世纪 · 叙事 · 旧纸",
    category: "奇幻",
    colors: ["#e8d5a3", "#9b643f", "#6f2637", "#33241e"],
    bestFor: "任务日志、地图、剧情选择",
    prompt:
      "medieval parchment game UI, aged paper, wax seals, ink flourishes, weathered leather borders, muted brown and burgundy palette, illuminated manuscript details",
  },
  {
    id: "candy-workshop",
    name: "糖果工坊",
    note: "圆润 · 明亮 · 休闲",
    category: "休闲",
    colors: ["#ffd77d", "#ff7fab", "#7fd8d0", "#604d72"],
    bestFor: "休闲手游、关卡选择、奖励弹窗",
    prompt:
      "casual mobile game UI, rounded chunky shapes, glossy candy materials, pastel colors, soft shadows, cheerful polished 2.5D rendering, friendly oversized controls",
  },
  {
    id: "abyssal-relic",
    name: "深海秘境",
    note: "幽蓝 · 珊瑚 · 神秘",
    category: "奇幻",
    colors: ["#72d7d0", "#277a8b", "#654b8f", "#101f31"],
    bestFor: "海洋冒险、魔法 HUD、收藏品",
    prompt:
      "mystical deep-sea game UI, bioluminescent cyan accents, carved coral frames, pearl inlays, dark navy glass, subtle caustic light, elegant aquatic ornamentation",
  },
  {
    id: "steam-artifice",
    name: "蒸汽机巧",
    note: "黄铜 · 齿轮 · 工业",
    category: "科幻",
    colors: ["#e2b467", "#9b5e3f", "#5d6f6b", "#252527"],
    bestFor: "机械建造、策略面板、仪表 HUD",
    prompt:
      "steampunk game UI, brushed brass and aged copper, precise gears and rivets, dark leather backing, warm workshop light, mechanical gauges, Victorian industrial craftsmanship",
  },
  {
    id: "crystal-sanctum",
    name: "冰晶圣殿",
    note: "晶莹 · 圣洁 · 寒霜",
    category: "奇幻",
    colors: ["#e5fbff", "#8dd5ee", "#788fca", "#202a48"],
    bestFor: "冰系技能、法师界面、圣殿菜单",
    prompt:
      "frozen crystal temple game UI, faceted ice borders, pale cyan glow, silver inlays, translucent frost glass, sacred geometric motifs, pristine high-fantasy polish",
  },
  {
    id: "desert-ruins",
    name: "荒漠遗迹",
    note: "砂岩 · 古文明 · 日光",
    category: "奇幻",
    colors: ["#e6c47a", "#bf7445", "#557b78", "#3b2a25"],
    bestFor: "探索游戏、遗迹谜题、沙漠地图",
    prompt:
      "ancient desert ruin game UI, carved sandstone slabs, turquoise inlays, sun-bleached gold, weathered hieroglyphic patterns, warm directional sunlight, archaeological adventure style",
  },
  {
    id: "ink-wuxia",
    name: "水墨江湖",
    note: "留白 · 书法 · 东方",
    category: "东方",
    colors: ["#ece6d5", "#c54f3b", "#5d7168", "#242321"],
    bestFor: "武侠菜单、角色面板、门派系统",
    prompt:
      "Chinese ink-wash wuxia game UI, expressive black brush strokes, rice paper texture, restrained cinnabar seals, jade accents, elegant negative space, refined traditional composition",
  },
  {
    id: "paper-tale",
    name: "纸艺童话",
    note: "剪纸 · 柔和 · 童话",
    category: "休闲",
    colors: ["#f4dca8", "#df8069", "#78a38c", "#4c5573"],
    bestFor: "治愈游戏、儿童界面、轻叙事",
    prompt:
      "storybook paper-cut game UI, layered handcrafted cardstock, soft felt texture, gentle pastel palette, subtle cast shadows, charming rounded silhouettes, whimsical clean composition",
  },
];

export const assetSources: AssetSource[] = [
  {
    id: "kenney-ui",
    name: "Kenney UI Pack",
    description: "按钮、面板、滑块、复选框等完整通用 UI，适合直接进引擎。",
    license: "CC0",
    licenseTone: "free",
    count: "430+",
    format: "PNG / SVG",
    tags: ["UI", "按钮", "面板"],
    url: "https://kenney.nl/assets/ui-pack",
    colors: ["#d6ff73", "#83b67a", "#33453d"],
  },
  {
    id: "kenney-pixel-adventure",
    name: "Kenney Pixel Adventure UI",
    description: "为像素冒险游戏准备的窗口、按钮、光标和状态元素。",
    license: "CC0",
    licenseTone: "free",
    count: "完整套装",
    format: "PNG",
    tags: ["像素", "RPG", "冒险"],
    url: "https://kenney.nl/assets/ui-pack-pixel-adventure",
    colors: ["#f0c36b", "#b96d4e", "#435d59"],
  },
  {
    id: "kenney-scifi",
    name: "Kenney Sci-Fi UI",
    description: "科幻面板、HUD 和控件，可作为霓虹、太空类项目基础素材。",
    license: "CC0",
    licenseTone: "free",
    count: "完整套装",
    format: "PNG / SVG",
    tags: ["科幻", "HUD", "面板"],
    url: "https://kenney.nl/assets/ui-pack-sci-fi",
    colors: ["#79e7ef", "#6686de", "#1a2540"],
  },
  {
    id: "game-icons",
    name: "Game-icons.net",
    description: "武器、技能、物品、职业和 GUI 图标，可在线改色并下载 SVG。",
    license: "CC BY 3.0",
    licenseTone: "credit",
    count: "4,180",
    format: "SVG / PNG",
    tags: ["图标", "技能", "物品"],
    url: "https://game-icons.net/",
    colors: ["#f1f1ea", "#8d8c94", "#25252b"],
  },
  {
    id: "superpowers",
    name: "Superpowers Asset Packs",
    description: "Pixel-boy 制作的 CC0 像素角色、地形和道具素材集合。",
    license: "CC0",
    licenseTone: "free",
    count: "多套",
    format: "PNG / TMX",
    tags: ["像素", "角色", "地形"],
    url: "https://github.com/sparklinlabs/superpowers-asset-packs",
    colors: ["#e8c46b", "#d66657", "#477470"],
  },
];

export const modelPresets: ModelPreset[] = [
  {
    id: "sdxl",
    name: "Stable Diffusion XL",
    family: "基础模型",
    description: "生态最成熟，游戏类 LoRA、ControlNet 与透明图工作流最丰富。",
    license: "OpenRAIL++",
    size: "约 6.9 GB",
    hardware: "建议 8–12 GB 显存",
    bestFor: ["LoRA", "透明 PNG", "风格复用"],
    url: "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0",
    comfy: true,
  },
  {
    id: "z-image",
    name: "Z-Image Turbo",
    family: "6B 基础模型",
    description: "新一代高效模型，提示词理解好，ComfyUI 已有官方工作流。",
    license: "Apache 2.0",
    size: "完整仓库约 33 GB",
    hardware: "建议 16 GB+ 显存/统一内存",
    bestFor: ["通用 UI", "快速草稿", "中文提示词"],
    url: "https://huggingface.co/Tongyi-MAI/Z-Image-Turbo",
    comfy: true,
  },
  {
    id: "qwen-image",
    name: "Qwen-Image",
    family: "20B 基础模型",
    description: "中英文文字渲染与精确编辑突出，适合需要烘焙标题的 UI。",
    license: "Apache 2.0",
    size: "完整仓库约 58 GB",
    hardware: "FP8 建议 24 GB 显存",
    bestFor: ["中文文字", "编辑", "复杂排版"],
    url: "https://huggingface.co/Qwen/Qwen-Image",
    comfy: true,
  },
  {
    id: "flux-schnell",
    name: "FLUX.1 Schnell",
    family: "12B 基础模型",
    description: "1–4 步快速生成，细节表现好，Apache 2.0 可商用。",
    license: "Apache 2.0",
    size: "约 24 GB",
    hardware: "建议 16–24 GB 显存",
    bestFor: ["高质图标", "概念稿", "材质细节"],
    url: "https://huggingface.co/black-forest-labs/FLUX.1-schnell",
    comfy: true,
  },
  {
    id: "game-icons-lora",
    name: "Game GUI Icons LoRA",
    family: "SD1.5 LoRA",
    description: "用 288 张卡通手游图标训练，适合快速生成技能和物品图标。",
    license: "未声明",
    size: "约 38 MB",
    hardware: "搭配 SD1.5，6 GB 显存可用",
    bestFor: ["手游图标", "技能", "道具"],
    url: "https://huggingface.co/yzeedoz/game-icons-lora",
    comfy: true,
    warning: "许可证未明确，建议仅用于原型或先向作者确认商用范围。",
  },
  {
    id: "mapchip-lora",
    name: "mapchipLora",
    family: "SDXL LoRA",
    description: "专门生成 16×16、32×32、48×48 像素地图块。",
    license: "Apache 2.0",
    size: "轻量 LoRA",
    hardware: "跟随 SDXL",
    bestFor: ["地图块", "像素地形", "Tilemap"],
    url: "https://huggingface.co/kokuren/mapchipLora",
    comfy: true,
  },
];
