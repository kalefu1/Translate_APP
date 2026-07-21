# 译界（Context Zero Translator）

纯客户端翻译、查词和英文校对工具。Web 与 Windows 客户端共享 React 界面，每次模型请求只发送当前输入，不保存翻译历史。

## 本地运行

需要 Node.js 20 或更新版本。

```bash
pnpm install
pnpm dev
```

打开页面后，在“模型设置”中添加支持 OpenAI-compatible Chat Completions 的 API 地址、密钥与模型标识，并先执行连接测试。

## 构建

```bash
pnpm test
pnpm build
```

`dist/` 是可部署到任意静态托管平台的 Web 版本。

Windows 安装包还需要 Rust stable、Microsoft C++ Build Tools 和 WebView2：

```bash
pnpm tauri build
```

生成的 NSIS 安装程序位于 `src-tauri/target/release/bundle/nsis/`。

## 隐私与密钥

- 输入与结果只保存在当前页面内存中，刷新或关闭后消失。
- Web 默认把 API 密钥放在 `sessionStorage`；主动选择“记住”后才写入 `localStorage`。
- Windows 客户端通过系统凭据管理器保存 API 密钥，并使用 Tauri 原生 HTTP 请求。
- Web 端必须使用允许浏览器跨域访问的 API。
