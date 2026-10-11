# mi-song-gpt

基于 [songloft-plugin-miot](https://github.com/songloft-org/songloft-plugin-miot) 定制的 Songloft 智能音箱 JS 插件：在原插件的音乐播放能力之上，新增**问答接管**与 **AI 播放意图语义判定**——小爱答得上的不打扰，答不上来的由大模型接话（可联网搜索），播放类指令始终优先走本地曲库。

> ℹ️ 与上游的区别：已移除 `updateUrl`（不检查上游更新，自动更新不会覆盖本定制版）；`download_url` 指向本仓库 Release，供插件商店/订阅源安装。详细部署、配置、验收与排错见 [DEPLOY.md](DEPLOY.md)。

> 🔄 **已同步上游** [songloft-plugin-miot](https://github.com/songloft-org/songloft-plugin-miot) **v2026.10.10**（含 DLNA 投屏接收、搜索简繁体匹配、设置页/播放器 UI 重构、播放状态校验与对话轮询修复、整点报时后续播）。同步方式见 [与上游同步](#与上游同步)。

> ™️ **商标声明**：本插件中提到的 "MIoT" "MiHome" 等协议 / 产品名称均归各自商标权人所有，相关名称的出现仅出于互操作和指示性合理使用目的。本插件**未获得任何商标持有人的授权或背书**，与上述商标持有人**无任何关联**。

## 新增功能

| 功能 | 说明 |
|---|---|
| **问答接管** | 非播放类指令先等小爱原生回答（默认 4s），答上来了就不打扰；命中"不知道/没听懂/没找到"类兜底话术或超时 → 打断小爱 → 播占位提示 → 问答大模型回答（可选联网搜索），带上下文历史与分段 TTS 播报 |
| **AI 播放意图语义判定** | 小模型（glm-4-flash / qwen-flash / doubao-mini 等）低温判定：判成播放类才执行，非播放类交给问答接管；prompt 已精简（约 700 token、普通模型 `max_tokens` 120）。采样参数按模型自适应：推理模型（GPT-5/6、o 系列、deepseek-r1 等）自动省略 `temperature`/`max_tokens`，避免上游 #508 的 400 报错 |
| **语音记忆** | 记住之前播过的说法，再次提及直接重播（上游内置能力） |

除上面两项外，其它一切都跟随官方 `songloft-plugin-miot`（默认播放模式、播放/对话日志、UI 排版等均与上游一致），因此上游更新几乎不会和本仓库冲突。

上游自带能力（设备分组多房间同步、法定节假日定时任务、外部搜索源接入、DLNA 投屏接收等）保持不变，见下文。

## 与上游同步

本仓库保留上游 git 血缘（首次导入对应上游 `39994df`），并带**自动同步 workflow**：`.github/workflows/sync-upstream.yml` 每天检查上游，能自动合并就推 main 并顺带发版，冲突或测试不过就开 issue 等你处理。

手工同步（需要时）：

```bash
git fetch upstream            # upstream = https://github.com/songloft-org/songloft-plugin-miot.git
git merge upstream/main       # 预期冲突只在 plugin.json / package.json（版本号、下载地址）
```

被改动的文件只有：`src/voicecmd/qa_fallback.ts`（新文件）、`src/voicecmd/engine.ts`（未命中分支接入 QA，约 40 行）、`src/handlers/{config,voice_command}.ts`、`src/service/service.ts`、`src/utils/{ai_url,ai_params}.ts`、`src/{types,mina/client,mina/models}.ts`、`src/config/manager.ts`，以及设置页第 5 个分栏「问答」。其余文件与上游保持一致，**升级官方能力只需拉一下**。

历次同步带入的上游能力（截至 v2026.10.10）：

| 能力 | 说明 |
|---|---|
| **整点报时后续播**（新增，默认关） | 设置 → 播放 → 「整点报时后续播」：按服务器时间，在整点后 90 秒内检测到报时打断播放后自动续播（该时段用音箱按键/小爱 App 主动停止也可能被恢复，主动停止请用 Songloft） |
| **歌名含控制词的修复** | 云端的口令匹配改为「控制与搜索命令共同匹配」：`播放歌单继续听` 这类歌名/歌单名里带控制词的说法不再被截走（上游 `fbb0cc5`） |
| **中途停播误判修复** | 结合真实进度、起播确认与尾部证据，避免中途回零被误判成播放失败 |

| 能力 | 说明 |
|---|---|
| **DLNA 投屏接收** | 插件作为局域网 DLNA 媒体渲染器被投屏 App 发现，收到 MP3 投放后转发到指定音箱播放（设置 → 工具 → DLNA 接收，需 `publicPaths: ["/dlna"]` 与新宿主的 `/dlna` 公共路径支持） |
| **简繁体搜索匹配** | 歌手/歌曲搜索支持繁体输入（opencc 映射表随构建生成 `src/data/traditional-to-simplified-map.ts`） |
| **设置页与播放器 UI 重构** | 语音设置改为分栏导航（监听 / 口令 / 记忆 / 搜索与 AI / 问答），曲库列表、播放栏、全屏播放器与胶囊迷你播放器材质对齐主程序 |
| **播放可靠性修复** | 中途停播误判、整点报时后续播、音箱未播完就切歌、播放失败标记导致歌单停播、`ubus` 限流引起的卡顿等 |
| **对话轮询优化** | 退避重试 + 同设备请求不重叠、启停隔离，降低对话查询频率 |
| **AI 参数兼容** | 上游 #508：推理模型不接受自定义采样参数；本定制版按模型名自适应处理 |

## 界面预览

**问答接管配置**——提示词、联网搜索、思考提示与历史轮数均可调整：

<img src="docs/images/qa-settings.webp" width="760" alt="问答接管配置卡片">

## 执行流程

```text
你说话
  ├─ ① 固定口令（切歌/音量/停止/定时/收藏…）        → 立即执行（零延迟）
  ├─ ② 语音记忆（之前播过的说法）                    → 直接重播
  ├─ ③ 搜索口令（"播放XX" / "我想听XX"）             → 本地曲库/外部搜索 → 推流播放
  ├─ ④ AI 语义判定（小模型，低温）
  │      ├─ 播放类（歌名/歌手/歌单/翻唱…）           → 搜索并播放
  │      └─ 非播放类（qa）                            → 进入 ⑤
  └─ ⑤ 问答接管
         ├─ 等小爱原生回答（≤4s），回答有效           → 不打扰，小爱自己答
         └─ 命中兜底话术（"不知道/没听懂/没找到…"）
            或超时无回答                              → 打断小爱 → 播"正在思考，请稍等"
                                                        → 问答大模型（可联网）→ TTS 播报
                                                        → 记入对话历史（下次可追问）
```

## 构建与安装

```bash
npm install
npm run build       # 产物 dist/mi-song-gpt.jsplugin.zip
npm run validate    # 校验 plugin.json 哈希
```

安装：songloft 网页 → 插件页面 → 无需卸载官方「智能音箱」(miot)，两者 entryPath 不同、可共存 → 上传 `dist/mi-song-gpt.jsplugin.zip`。安装后插件名为 **mi-song-gpt**。

> ⚠️ **宿主版本要求**：`plugin.json` 的 `renderEngine` 只能是 `webview` / `lynx` 或省略。上游 v2.13.0 已彻底移除 WebF 引擎， 新宿主会直接拒绝 `renderEngine: "webf"` 的包（报 `renderEngine must be "webview" or "lynx" (or omitted)`）——本仓库已修正为 `webview`。

配置页分栏：语音设置（监听 / 口令 / 记忆 / 搜索与 AI / 问答）、设备设置、播放设置、定时与节假日、工具箱（含 DLNA 接收）。验收清单与常见问题见 [DEPLOY.md](DEPLOY.md)。

## Development

```bash
npm run dev         # watch + auto-upload to local Songloft
npm run validate    # verify plugin.json hashes
node --test tests/*.mjs        # 插件侧单元测试
cd frontend && npm test        # 前端契约与播放回归测试（需先构建）
```

### Windows 本地构建

Windows 上 Node 18.20.2 / 20.12.2 起禁止直接 `execFileSync('npm.cmd', …)`，而 `@songloft/plugin-builder` 正是这样调 npm 构建前端的，会报：

```text
📦 Installing frontend dependencies...
spawnSync npm.cmd EINVAL
```

本仓库通过 `scripts/patch-plugin-builder.mjs`（`npm install` 的 `postinstall` 自动执行）把 builder 的两处调用改为 `node npm-cli.js …`，无需手工处理；若换用 pnpm/yarn 安装依赖，可手动执行一次 `node scripts/patch-plugin-builder.mjs`。

### 行尾约定

`.gitattributes` 固定 LF（`* text=auto eol=lf`）：`frontend/tests/run.mjs` 等契约测试直接读源码做正则断言，CRLF 工作区会误报；行尾不一致也会让本地构建产物与 CI 的 `zipHash` 不可复现。

### 胶囊迷你播放器材质

播放器保留宿主玻璃填充的 RGB，亮色不透明度至少 96%、暗色至少 92%，宿主更实心的填充继续保留。手机和宽屏共用独立背景模糊层，按钮和文字保持清晰；不支持模糊、减少透明度或增强对比度时使用实心填充。主题、宿主偏好与浏览器偏好变化会实时更新，缺少新偏好的 Flutter/旧宿主消息仍可使用。

填充保护与对比度回归见 `frontend/tests/player_material.test.mjs`，覆盖默认 Flutter/Lynx 亮暗色与黑白背景，不保证任意自定义主题色板都满足对比度。运行 `cd frontend && npm run typecheck && npm run build && npm test`；测试使用构建产物，因此需先构建。

## DLNA 投屏接收

插件可作为一个局域网 DLNA/UPnP 媒体渲染器（MediaRenderer）被手机投屏 App 发现：收到 MP3 投放后转发到指定的已管理音箱播放。宿主侧需开放 `/dlna` 公共路径（见 `plugin.json` 的 `publicPaths`）。配置入口：插件页 → 设置 → 工具 → **DLNA 接收**。详见 [docs/dlna-receiver.md](docs/dlna-receiver.md)。

## 设备分组（多房间同步）

把多台音箱归入同一「设备分组」后，对组内**任一**音箱的播放控制会自动同步给组内**其他**成员，实现多房间同步播放。

实现方式很简单：**一个分组共用一套播放列表**——同一份队列、播放索引、播放模式、切歌定时器与随机序列，所有指令一次性下发给组内全部音箱。

- **覆盖操作**：播放歌单、暂停、继续、停止、上一首、下一首、切换播放模式、调节音量，以及单曲 URL 推送。
- **命令入口全覆盖**：无论从插件网页的播放控制按钮、对音箱说语音口令（如「下一首」「停止」「调大音量」），还是定时任务触发，都会带动全组。
- **切歌与自动续播都同步**：因为全组只有一份队列/一个定时器/一次随机选择，无论手动切歌还是一首播完自动续播，全组始终是同一首，**随机模式下也不会各放各的**。
- **容错**：组内某台离线/失败只记录告警，其余音箱照常播放；离线的音箱恢复后，下一条指令（含自动切歌）会自然覆盖到它。
- **成员互斥**：一台设备最多属于一个组。把设备加入新组时会自动从其它组移除。删除分组或移出成员后，相关设备恢复独立播放。

配置入口：插件页 → 设置 → 设备 → **设备分组**。点「新建分组」，填名称并勾选至少 2 台已启用管理的设备即可。分组信息持久化在插件本地存储，跨重启保留。

> 说明：智能音箱各自独立接收云端指令，不存在帧级同步协议，成员之间可能有轻微起播时差，属正常现象。

## 定时任务 - 法定节假日

定时任务的「每周」调度支持中国法定节假日感知,有三种模式:

- **忽略节假日**(默认):完全按勾选的星期触发,行为与节假日无关。
- **仅法定节假日触发**:今天必须是法定放假日(春节、国庆等)才触发,且星期也需在勾选范围内。适合「节假日早晨播音乐迎接好心情」这类场景。
- **真·工作日(跳过节假日,含调休补班)**:勾选「周一到周五」后开启此模式,则节假日跳过、调休补班的周末强制触发,符合「真正上班日的闹钟」语义。

节假日数据来自 [NateScarlet/holiday-cn](https://github.com/NateScarlet/holiday-cn)(MIT 协议),由 `npm run build`(或 `dev`)的 `prebuild` 钩子从 jsDelivr / GitHub raw 下载,覆盖当前年和下一年,并通过 esbuild 编入插件 bundle。运行时不需要网络访问。

注意事项:
- 国务院通常每年 11 月公布次年安排,在此之前下一年的节假日数据为空,此时会按「平常日」处理(不影响普通调度,但「仅法定节假日触发」模式将不会触发)。
- 每次发版会自动滚动到最新数据;长期未更新的插件版本可能缺失最新节假日,建议定期升级插件。
- 数据下载产物已 commit 入库,本地无网络也可构建。

## 发版节奏

版本号就是发版日期(如 `2026.7.27`,无前导零)。CI 每天北京时间 08:17 自动检查一次:

- **自上次发版以来有新提交** → 构建并发布 `v<当天日期>`,即「今天的修改明天出新包」。
- **没有新提交** → 跳过,不产生空版本。

所以版本号会跳日(比如 `2026.7.25` 的下一版是 `2026.7.27`),这是正常的——中间那天没有改动。需要立刻出包时,维护者可在 Actions 页手动触发,手动触发不受上述门禁限制。

同一天重复发版会覆盖当天的 Release,但版本号不变,已安装的客户端**不会**提示升级,需等次日。

## 作为搜索源接入 mi-song-gpt（供插件开发者）

mi-song-gpt 在本地曲库搜不到歌时,会调用用户配置的「外部搜索源」把歌找回来推给音箱。任何插件只要实现了搜索接口,就能把自己**登记为候选**,出现在 mi-song-gpt 配置页的搜索源下拉里供用户一键选用——不必再靠内置写死列表。

接入分两步:

### 1. 实现搜索接口 `/api/search/topone`

`POST`,请求/响应遵循 topone 规范(完整定义见 mi-song-gpt 配置页「外部搜索」区的**「接口规范」**对话框):

- 请求体 `{ keyword, hint?: { title, artist, duration }, quality? }`
- 成功响应 `{ code: 0, msg, data: { title, artist, album?, duration?, cover_url?, url?, plugin_entry_path?, source_data?, dedup_key?, lyric?, lyric_source? } }`
- 未命中 / 失败返回 `code != 0`、`data: null`;**超时 6 秒**

内置的 `ytdlp` / `bili` / `subsonic` 即此规范的参考实现。

### 2. 经插件间通信(`songloft.comm`)注册为候选

在你的 `plugin.json` 声明 `inter-plugin` 权限,并在 `onInit` 里向 mi-song-gpt 注册:

```ts
// 延迟 + 重试,规避与 mi-song-gpt 同时启动的竞态;
// mi-song-gpt 未安装 / 旧版 host 无 comm 时静默跳过,绝不阻塞自身功能。
function registerToMiSongGpt() {
  let attempts = 0;
  const tryRegister = async () => {
    attempts++;
    try {
      if (!songloft.comm || typeof songloft.comm.call !== 'function') return;
      await songloft.comm.call('mi-song-gpt', 'register-search-provider', {
        name: '我的音源',                  // 下拉显示名
        searchPath: '/api/search/topone',  // 你的搜索路由(默认即此,可省)
        icon: '',                          // 可选
      });
    } catch (e) {
      if (attempts < 5) setTimeout(tryRegister, 3000);
    }
  };
  setTimeout(tryRegister, 2000);
}
```

| action | 说明 |
|--------|------|
| `register-search-provider` | 注册 / 更新候选(幂等,按 entryPath 覆盖,每次 onInit 重复调用即可) |
| `unregister-search-provider` | 注销候选(可选,一般在 onDeinit 调用;payload 传空即可) |

要点:

- **不用传 entryPath**:mi-song-gpt 以宿主注入的**可信调用方身份**为准(`from`),插件无法把自己伪造成别的插件。
- **payload 字段**:`name`(显示名,缺省用 entryPath)、`searchPath`(默认 `/api/search/topone`)、`icon`(可选)。
- **纯增强、无副作用**:注册只是让你出现在候选下拉;是否启用由用户在配置页决定。mi-song-gpt 会通过宿主插件列表校验你的 `installed/active` 状态,你被卸载后会自动从列表消失。
- **向后兼容**:内置 `ytdlp/bili/subsonic` 也走这套注册流程,同时保留在内置 fallback 列表中,兼容尚未接入的旧版本。

## Author

- 上游 [songloft-plugin-miot](https://github.com/songloft-org/songloft-plugin-miot)：hanxi
- 本定制版 mi-song-gpt：wyrt0

## 免责声明

- 本项目**仅供个人学习研究技术使用**，严禁任何形式的商业用途，不得使用本代码进行任何形式的牟利 / 贩卖 / 传播。
- 本项目不附带任何第三方设备协议实现或账号体系；与第三方设备通信所产生的数据、账号凭据均由使用者自行提供与管理，对于这些数据本项目不拥有所有权。
- 本项目完全免费，仅供个人私下范围研究交流学习技术使用，对于使用者在违反当地法律法规情况下使用本项目所造成的任何违法违规行为，由使用者自行承担。
- 若你使用了本项目，即代表你接受以上声明。

## License

Apache-2.0 © 2026 hanxi

完整协议文本见 [LICENSE](LICENSE)。本定制版基于上游 [songloft-plugin-miot](https://github.com/songloft-org/songloft-plugin-miot) v2026.9.24 修改，改动说明见上文「与上游的区别」及 Author 节。
