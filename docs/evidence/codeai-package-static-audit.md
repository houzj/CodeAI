# CodeAI Windows 包静态审计

审计时间：2026-11-16

## 产物

- NSIS 安装包：`E:\CodeAI\dist\desktop\codeai-desktop-win-x64.exe`
- NSIS SHA-256：`7BCDC1CC1CE716EE3F820EE7BB79184A12CC9E3B4B27BBF995A9A7A8032E48C1`
- 便携主程序：`E:\CodeAI\.cache\codeai-prepackaged\CodeAI.exe`
- 便携主程序 SHA-256：`21A3011CE5C14431303FB544820B76DD40FA757E22B4F177754235F1B53D4F2E`
- 本地编译 CLI：`E:\CodeAI\.cache\codeai-prepackaged\resources\opencode-cli.exe`
- 本地编译 CLI SHA-256：`4C22B2FF57EB994989EC31A57B1C01A96252CD81F51E696596DC658F5C4E5EC7`

## 结果

- `CodeAI.exe` 存在，大小 `246588416` 字节。
- 本地编译 CLI 存在，大小 `284408832` 字节。
- ASAR 解包后的关键用户可见品牌扫描为 `0` 命中。
- CLI 关键旧品牌文案扫描为 `0` 命中。
- 源码品牌门禁通过。
- Windows 启动、重启恢复、审批和取消仍由[人工验收清单](../verification/manual-desktop-gate.md)覆盖。
