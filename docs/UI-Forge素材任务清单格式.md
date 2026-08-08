# UI Forge 素材任务清单格式

`ui-forge.asset-tasks/v1` 用于把游戏设计阶段的长篇素材清单转换为美术生成、验收和游戏接入都能读取的标准 JSON。

## 顶层字段

- `schemaVersion`：固定为 `ui-forge.asset-tasks/v1`
- `manifestId`：本次清单分析任务 ID
- `source`：原始文档名称、导入时间和本地备份地址
- `project`：项目名、引擎、设计分辨率、视觉总纲、运行时素材根目录和摘要
- `taskCount`：标准任务数量
- `stats`：按优先级和素材类型统计
- `tasks`：素材制作任务数组

## 任务字段

每条 `tasks[]` 都包含：

- 身份：`taskId`、`assetId`、`displayName`
- 排期：`priority`、`status`
- 分类：`assetType`、`kind`、`category`、`system`
- 规格：`quantity`、`size`、`format`、`transparent`、`ninePatch`
- 组织：`states`、`elements`、`generationMode`、`variants`
- 交付：`fileName`、`runtimePath`
- 生成：`prompt`、`styleName`、`stylePrompt`、`negativePrompt`
- 验收：`technicalRequirements`、`acceptanceCriteria`
- 溯源：`sourceRefs`

`generationMode` 的取值：

- `single`：单个独立素材
- `state_sheet`：同一母版的多状态套装
- `icon_sheet`：同类图标或裁切集合
- `layered`：需要底图、遮罩或叠层组合
- `manual`：字体、授权、文档或必须人工制作的任务

## 接入约定

游戏开发端应以 `assetId` 作为稳定主键，以 `runtimePath + fileName` 作为预期交付位置。中文名称变化不应导致 `assetId` 改名。

任务初始状态为 `NOT_STARTED`，后续可以依次更新为 `IN_PROGRESS`、`READY_FOR_REVIEW`、`ACCEPTED`。状态变化不改变文件命名。

UI Forge 会把原始文档、执行日志和标准清单保存在：

```text
outputs/task-manifests/<manifestId>/
├─ source.md
├─ source-part-*.md
├─ analysis.log
├─ run.json
└─ manifest.json
```
