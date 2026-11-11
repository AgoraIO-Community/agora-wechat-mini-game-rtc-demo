# Agora 微信小游戏 RTC 音频 Demo

本工程是 [agora-wechat-mini-game-rtc-sdk](https://www.npmjs.com/package/agora-wechat-mini-game-rtc-sdk) 的示例 Demo，演示在微信小游戏环境中使用声网 RTC 音频 SDK：

- 加入/离开频道
- 发布/取消发布麦克风音频
- 自动订阅并播放远端音频
- 手动订阅/取消订阅最近一个远端音频用户
- 本地静音/取消静音
- 本地和远端音量等级显示
- 原生音频统计信息显示

Demo 源码仓库：<https://github.com/AgoraIO-Community/agora-wechat-mini-game-rtc-demo>

## 目录结构

```text
.
├── game.js                          Demo 页面与交互逻辑
├── game.json                        小游戏配置（含 iOS 高性能模式）
├── config.js                        App ID、频道、Token 配置
├── project.config.json              微信开发者工具项目配置
├── js/libs/rtc-sdk.min.js           SDK 主模块
├── js/libs/rtc-wasm.min.js          WASM bridge
└── rtc_audio.wasm.br                音频引擎二进制
```

`rtc_audio.wasm.br` 必须放在小游戏工程根目录（与 `game.js` 同级），且不要修改文件名。`js/libs/` 下的两个文件也不要在工程内移动位置或改名。

## 环境要求

- 微信开发者工具，导入项目时选择“小游戏”
- 一个可用的微信小游戏 AppID（在开发者工具或 `project.config.json` 中配置）
- 声网 App ID；如果项目开启了 Token 鉴权，还需要提供 Token
- iOS 真机需要开启微信小游戏高性能模式，并声明麦克风隐私权限

## 快速开始

### 1. 获取代码

```sh
git clone https://github.com/AgoraIO-Community/agora-wechat-mini-game-rtc-demo.git
cd agora-wechat-mini-game-rtc-demo
```

### 2. 导入微信开发者工具

打开微信开发者工具，选择“导入项目”，项目类型选择“小游戏”，选择本目录，并填入自己的小游戏 AppID。

### 3. 配置 App ID、频道和 Token

编辑 `config.js`：

```js
export const config = {
  appId: 'YOUR_AGORA_APP_ID',
  channel: 'demo-channel',
  token: '',
  enableLogUpload: false,
  logLevel: 'info',
};
```

- `appId`：声网 App ID。
- `channel`：频道名，两个客户端加入同一个频道才能互通。
- `token`：留空时使用 App ID 鉴权；开启 Token 鉴权时填入服务端生成的 Token。
- `enableLogUpload`：设为 `true` 会开启 SDK 日志上传；仅在排查问题时开启。
- `logLevel`：日志级别，可选 `debug`、`info`、`warn`、`error`、`none`。

### 4. 配置微信平台能力

#### 服务器域名

在微信公众平台的“开发管理 -> 开发设置 -> 服务器域名”中配置：

- request 合法域名：
  `https://webrtc2-2.ap.sd-rtn.com;https://webrtc2-ap-web-1.agora.io;https://webrtc-cloud-proxy.sd-rtn.com;https://webrtc-cloud-proxy.agora.io`
- socket 合法域名：
  `wss://webrtc-cloud-proxy.sd-rtn.com;wss://webrtc-cloud-proxy.agora.io`

开发阶段如果暂时关闭了开发者工具的合法域名校验，发布前仍需在后台完成配置。

#### 麦克风隐私声明

在微信公众平台的“管理 -> 账号设置 -> 基本设置 -> 服务内容声明”中，于“用户隐私保护指引”声明麦克风用途，并开启隐私授权弹窗。

Demo 在创建并发布麦克风 track 前调用 `wx.requirePrivacyAuthorize`，首次使用会触发隐私授权；如果未声明麦克风用途，录音可能返回 `errno 1026`。

#### iOS 高性能模式

1. 在微信小游戏后台开通高性能模式：登录微信公众平台 -> 功能 -> 首页游戏能力地图 -> 研发能力 -> 生产提效包 -> 开通高性能模式。
2. 确认 `game.json` 包含：

```json
{
  "deviceOrientation": "portrait",
  "iOSHighPerformance": true,
  "iOSHighPerformance+": true
}
```

iOS 普通模式没有 JIT，WASM 和 Opus 性能不足以支撑实时音频，请使用真机验证。Android 无需额外配置。

### 5. 运行和验证

1. 在开发者工具中编译并运行 Demo。
2. 点击 **Join** 加入频道；Demo 不传 `uid`，SDK 会自动生成并返回，界面会显示当前 UID。
3. 使用另一个客户端（另一台设备或另一个 Demo 实例）加入同一个 `appId` 和 `channel`。两个实例的 UID 必须不同。
4. 在任一客户端点击 **Publish mic** 发布麦克风音频。
5. 对端收到 `user-published` 后会自动订阅并播放；也可以使用 **Subscribe audio/Unsubscribe audio** 按钮控制最近一个发布音频的远端用户。
6. 点击 **Mute mic/Unmute mic** 切换本地静音；静音不会停止发布。
7. 界面每 2 秒刷新本地/远端音量等级，并显示 SDK 的原生音频统计信息。
8. 点击 **Leave** 退出频道并释放资源。

## 更新 SDK

本 Demo 使用以下三个 SDK 运行时文件：

- `js/libs/rtc-sdk.min.js`
- `js/libs/rtc-wasm.min.js`
- `rtc_audio.wasm.br`

如需从 npm 包更新，可执行：

```sh
npm pack agora-wechat-mini-game-rtc-sdk
tar -xzf agora-wechat-mini-game-rtc-sdk-*.tgz
cp package/rtc-sdk.min.js js/libs/
cp package/rtc-wasm.min.js js/libs/
cp package/rtc_audio.wasm.br ./
```

三个文件必须来自同一个 release 版本，避免 JS 与 WASM 版本不匹配。

## 常见问题

**加入频道一直停留在 CONNECTING？**

- 检查网络能否访问声网网关。
- 检查 request/socket 合法域名是否已配置。
- 检查 `rtc_audio.wasm.br` 是否位于工程根目录且未被改名。

**发布麦克风失败，返回 `errno 1026`？**

- 在微信公众平台补充麦克风隐私声明。
- 确认调用 `wx.requirePrivacyAuthorize` 并等待用户授权完成。

**订阅成功但没有声音？**

- 确认对端已经发布音频，且没有被远端静音。
- 确认已调用 `track.play()`，且 `track.state === 'playing'`。
- iOS 请确认已开启高性能模式并使用真机测试。

**为什么会被踢出频道？**

同一 App ID + 频道内 UID 必须唯一。两台设备或模拟器使用相同 UID 会互踢，请为每个实例使用不同 UID。

**WASM 加载失败？**

检查 `rtc_audio.wasm.br` 是否在工程根目录、文件名是否正确，并确认它和 `rtc-sdk.min.js`、`rtc-wasm.min.js` 是同一版本构建产物。

## 相关链接

- SDK npm 包：<https://www.npmjs.com/package/agora-wechat-mini-game-rtc-sdk>
- Demo 仓库：<https://github.com/AgoraIO-Community/agora-wechat-mini-game-rtc-demo>
- 微信小游戏高性能模式：<https://developers.weixin.qq.com/minigame/dev/guide/performance/perf-high-performance.html>
- `wx.requirePrivacyAuthorize`：<https://developers.weixin.qq.com/miniprogram/dev/api/open-api/privacy/wx.requirePrivacyAuthorize.html>
