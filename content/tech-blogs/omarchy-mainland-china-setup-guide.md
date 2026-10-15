---
title: 面向中文用户的 Omarchy 优化：网络与输入法
summary: 在 Omarchy 上配置 Omash 网络代理与 Fcitx5 拼音，并解决 ChatGPT 桌面端候选框的显示问题。
tags: [Omarchy, Arch Linux, Hyprland, Omash, Mihomo, Fcitx5, 中文输入]
date: "2026-09-09"
featured: true
---

## Omarchy 是什么

Omarchy 是建立在 Arch Linux、Hyprland 与 Quickshell 之上的完整桌面发行版：它把人和 AI agent 共同使用电脑当成一等场景，支持用 agent 诊断崩溃、理解并定制系统；同时将终端、通知、状态栏、主题、截图和维护命令整合为统一工作流。深色像素艺术、等宽字体和克制的高亮色又让它有一套明确的视觉语言。正是这种 agentic 能力、统一性与美感，让我决定尝试把它作为我游戏本唯一的系统。[Omarchy 官方介绍](https://omarchy.org/)

## 中文用户入手可能面临的两个痛点

Omarchy 的特质足以让人愿意把它当作主力系统；但当中文用户真正开始使用时，还是不可避免会碰到两个问题。首先是网络：软件库、AUR、GitHub 仓库和语言运行时的拉取，以及依赖在线服务的 AI agent，都离不开稳定连接。其次是 Omarchy 的英语原生体验：系统没有内置面向中文用户的拼音输入方案，需要自行补上输入法引擎，并确认候选框能在桌面应用中正常显示。网络几乎决定了主打 agentic 的 Omarchy 能否发挥完整体验，因此我们先从它开始。

## 可靠的网络底座：Omash

我一开始尝试过两个方案，但由于一些原因最终都选择了放弃：纯 Mihomo 内核时，TUN 模式下稳定性极其脆弱，很容易因为配置文件 tun 和 dns 设置错误出现 DNS 解析循环的问题；即使不考虑这个问题，仍要自己编写并维护 systemd 服务本身也是多出了些工作量（网络问题尚未解决时无法拷贝粘贴，累到的只有敲键盘敲到断的手指）。CVR 的功能更完整，但官方没有原生 Arch 版本，而且独立图形客户端的视觉语言与 Omarchy 不一致，也就把我再次劝退了。

不过好在最后我找到了 Omash。它从 CVR 分叉而来，但将界面收敛为面向 Omarchy 的 Rust 终端仪表盘：Mihomo 由用户级服务持续运行，即使退出 TUI，代理也不会停止；它还能导入配置、切换 Rule／Global／Direct 模式、选择代理与测试延迟，并跟随当前 Omarchy 配色。官方 README 也说明它会负责新启动应用的系统代理环境，因此它补上的正是单独使用 Mihomo 时缺失的那层集成。[Omash README](https://github.com/ourongxing/omash)

但即使 Omash 是面向 Omarchy 专门设计的，中文用户的安装过程仍然是会遇到一些问题，基本都是和网络相关的，这里我要分享的是我安装过程中所遇到的两个问题：

### 问题一：Mihomo 在 AUR 构建时超时

按照 README，第一步需要安装 Mihomo：

```bash
omarchy pkg aur add mihomo
```

命令本身没有问题，失败发生在构建阶段。`mihomo` 是 Go 项目，构建时还要下载 Go 模块；默认 Go 源无法完成这些依赖的拉取，于是构建一直等待，最后以超时结束。

解决方法是先将 Go 模块代理切换到可访问的镜像，再重新执行安装：

```bash
go env -w GOPROXY=https://goproxy.cn,direct
omarchy pkg aur add mihomo
```

换源后依赖可以正常下载，`mihomo` 便能够顺利构建完成。这里不需要绕开 AUR 手动寻找预编译二进制；保留 Omarchy 的包管理路径，后续更新和排查也更简单。

### 问题二：Omash 安装脚本无法下载

Mihomo 安装完成后，README 给出的 Omash 安装方式是：

```bash
curl -fsSL https://raw.githubusercontent.com/ourongxing/omash/main/scripts/install | bash
```

这条命令依赖 GitHub Raw。在我的机器上，脚本下载请求超时，安装无法继续。改走源码本地构建本来是自然的备选方案，但若仍用 HTTPS 克隆仓库：

```bash
git clone https://github.com/ourongxing/omash.git
```

同样会在网络这一关停住。

我采用 SSH 拉取。先将本机的 SSH 公钥添加到 GitHub 账户，再使用 SSH 地址克隆：

```bash
git clone git@github.com:ourongxing/omash.git
cd omash
cargo build --locked --release
```

构建完成后，按 README 将二进制安装到本地路径即可：

```bash
install -Dm755 target/release/omash "$HOME/.local/bin/omash"
systemd_user_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
install -Dm644 systemd/omash-supervisor.service \
  "$systemd_user_dir/omash-supervisor.service"
sed -i 's|^ExecStart=.*|ExecStart=%h/.local/bin/omash --daemon|' \
  "$systemd_user_dir/omash-supervisor.service"
systemctl --user daemon-reload
```

如果 SSH 也不可用，另一条可行路径是在网络正常的机器上下载或克隆源码，再将源码目录拷贝到目标机器进行本地构建。关键不在于一定要通过某一种协议安装，而是让源码和构建依赖能可靠到达本机。

安装完成后，在终端输入：

```bash
omash
```

即可打开 Omash。首次进入后，在 Profiles 页面导入自己的订阅链接或本地配置文件；随后选择需要使用的配置并开启代理即可。配置内容因人而异，文章不展示任何订阅、节点或规则信息。

## 中文输入：从 Fcitx5 开始

网络稳定后，软件安装、运行时下载和 AI agent 才真正具备可用的基础；但对中文用户而言，日常输入还差最后一块拼图。Omarchy 的桌面集成了 Fcitx5，却没有默认提供拼音输入方案。接下来先安装拼音引擎，再配置中英文切换。

### 安装拼音引擎

Omarchy 已经处理好了 Fcitx5 与 Wayland 桌面的基础集成，因此不需要从头搭建输入法框架。中文输入所缺的是拼音引擎，安装 `fcitx5-chinese-addons` 即可：

```bash
omarchy pkg add fcitx5-chinese-addons
```

安装完成后重新登录桌面会话，或重启 Fcitx5，让新引擎被载入。

### 部分应用输入法候选框消失

不过输入法安装完成并不意味着大功告成。实际使用中我还是碰到了一个问题：Chromium 内中文输入法的候选框正常显示，而在 ChatGPT 桌面端中却消失不见。这背后的原因是候选框属于输入法创建的独立窗口，不同应用的渲染路径对 Wayland 分数缩放的处理不同；ChatGPT 桌面端在 1.25 倍缩放下没有正确显示它。解决的方法也很简单：将显示器缩放改为 1 后，候选框立即恢复，无需改动 Fcitx5 或 ChatGPT 的配置：

```lua
hl.monitor({
  output = "HDMI-A-1",
  mode = "1920x1080@200",
  position = "0x0",
  scale = 1,
})
```

遇到“浏览器正常、个别桌面应用看不到候选框”时，我们也可以先检查显示器缩放。

## 总结

到这里，我们也就基本解决了中文用户开始使用 Omarchy 时可能会遇到的两大痛点。

网络和输入体验完善后，Omarchy 的优点就能真正体现出来：它开源、轻量，agent 与系统的融合也很自然。许多原本需要翻配置文件、查文档才能完成的自定义，都可以直接用自然语言交给 agent 处理；这让 Arch 与 Hyprland 的可定制性不再只属于熟悉命令行的人。

作为 Linux 系统，它对开发也十分友好。Shell 命令、Docker 等工具都能直接运行在原生环境中，不必隔着额外的兼容层。这套系统尤其适合以开发为主，同时也想兼顾 Steam 游戏体验的玩家。Steam 生态可以正常使用，N系显卡的驱动支持也很稳定。这里我会建议开启 Steam 大屏幕模式，体验上基本可以接近SteamOS。

当然，Omarchy 仍有待补齐的地方：系统语言目前还没有中文支持。我们相信官方在不远的将来也能够解决这一问题，真心期待一个更好的 Omarchy。
