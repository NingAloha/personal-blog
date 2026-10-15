---
title: "Optimizing Omarchy for Chinese Users: Network Access and Chinese Input"
summary: "How to configure Omash networking and Fcitx5 Pinyin on Omarchy, including a fix for the missing candidate window in the ChatGPT desktop app."
tags: [Omarchy, Arch Linux, Hyprland, Omash, Mihomo, Fcitx5, Chinese Input]
date: "2026-09-09"
featured: true
---

## What Is Omarchy?

Omarchy is a complete desktop distribution built on Arch Linux, Hyprland, and Quickshell. It is designed around people and AI agents using the computer together: agents can diagnose crashes, understand the system, and help customize it. It also brings the terminal, notifications, status bar, themes, screenshots, and maintenance commands into a unified workflow. Its dark pixel-art aesthetic, monospace typeface, and restrained accent colors give it a distinct visual language. Its agent-friendly workflow, coherence, and visual appeal are exactly why I decided to try it as the only system on my gaming laptop. [Official Omarchy introduction](https://omarchy.org/)

## Two Common Pain Points for Chinese Users

Omarchy has plenty of qualities that make it worth using as a daily driver. But Chinese users will still run into two practical issues. The first is networking: package repositories, the AUR, GitHub, language runtimes, and AI agents that depend on online services all need a stable connection. The second is its English-first experience: it does not include a Pinyin input method out of the box, so an input engine must be added and its candidate window needs to work properly in desktop applications. Networking largely determines whether Omarchy's agent-driven workflow can be used to its full potential, so I will start there.

## A Reliable Networking Foundation: Omash

I initially tried two other approaches, but ultimately gave up on both. Using Mihomo alone made TUN-mode stability extremely fragile: an incorrect `tun` or `dns` setting in the configuration could easily cause a DNS resolution loop. Even aside from that, writing and maintaining a systemd service yourself adds more work. CVR is more fully featured, but it has no native Arch release, and its standalone graphical client does not match Omarchy's visual language.

Fortunately, I later found Omash. It is forked from CVR, but refocused as a Rust terminal dashboard for Omarchy. Mihomo is kept running by a user service, even after the TUI exits. Omash can import configurations, switch among Rule, Global, and Direct modes, select proxies, and test latency, all while following the current Omarchy color scheme. Its README also explains that it sets the system-proxy environment variables for newly launched applications. That is the integration layer missing when Mihomo is used by itself. [Omash README](https://github.com/ourongxing/omash)

Even though Omash is designed specifically for Omarchy, Chinese users may still encounter installation issues, mostly related to networking. Here are the two I encountered.

### Problem 1: Mihomo Times Out While Building from the AUR

According to the README, the first step is to install Mihomo:

```bash
omarchy pkg aur add mihomo
```

The command itself is fine; the failure happens during the build. `mihomo` is a Go project, and building it requires downloading Go modules. The default Go module proxy could not retrieve those dependencies in my case, so the build stalled and eventually timed out.

Switch the Go module proxy to an accessible mirror before running the installation again:

```bash
go env -w GOPROXY=https://goproxy.cn,direct
omarchy pkg aur add mihomo
```

After switching proxies, the dependencies downloaded normally and Mihomo built successfully. There is no need to bypass the AUR by hunting down a prebuilt binary manually; staying on Omarchy's package-management path also makes future updates and troubleshooting simpler.

### Problem 2: The Omash Installation Script Cannot Be Downloaded

After Mihomo is installed, the Omash README suggests installing it with:

```bash
curl -fsSL https://raw.githubusercontent.com/ourongxing/omash/main/scripts/install | bash
```

This command depends on GitHub Raw. On my machine, the script download timed out and the installation could not continue. Building from a local source checkout would normally be a natural fallback, but cloning the repository through HTTPS also stopped at the same network hurdle:

```bash
git clone https://github.com/ourongxing/omash.git
```

I used SSH instead. First add your local SSH public key to your GitHub account, then clone with the SSH URL:

```bash
git clone git@github.com:ourongxing/omash.git
cd omash
cargo build --locked --release
```

After the build completes, install the binary to a local path as described in the README:

```bash
install -Dm755 target/release/omash "$HOME/.local/bin/omash"
systemd_user_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
install -Dm644 systemd/omash-supervisor.service \
  "$systemd_user_dir/omash-supervisor.service"
sed -i 's|^ExecStart=.*|ExecStart=%h/.local/bin/omash --daemon|' \
  "$systemd_user_dir/omash-supervisor.service"
systemctl --user daemon-reload
```

If SSH is not available either, another workable route is to download or clone the source on a machine with normal network access, copy the source directory to the target machine, and build it locally. The point is not to insist on a particular installation protocol, but to make sure both the source and its build dependencies can reliably get to the machine.

After installation, run the following command in a terminal:

```bash
omash
```

This opens Omash. On first launch, go to Profiles and import your subscription URL or local configuration file. Then select the configuration you need and enable the proxy. Configurations vary from person to person, so this article does not show any subscription, node, or rule details.

## Chinese Input: Start with Fcitx5

Once the network is stable, software installation, runtime downloads, and AI agents finally have a usable foundation. But Chinese users are still missing the last piece of the daily experience: input. Omarchy integrates Fcitx5 into the desktop, but does not provide a Pinyin solution by default. The next steps are to install the Pinyin engine and configure switching between Chinese and English.

### Install the Pinyin Engine

Omarchy has already handled the basic integration between Fcitx5 and the Wayland desktop, so there is no need to build the input-method framework from scratch. What Chinese input lacks is the Pinyin engine; install `fcitx5-chinese-addons`:

```bash
omarchy pkg add fcitx5-chinese-addons
```

After installation, sign out and back into the desktop session, or restart Fcitx5, so that the new engine is loaded.

### The Candidate Window Disappears in Some Applications

Installing the input method did not quite finish the job for me. Chinese input candidates appeared normally in Chromium, but disappeared in the ChatGPT desktop app. The candidate window is a separate window created by the input method, and different application rendering paths handle Wayland fractional scaling differently. At 1.25x scaling, the ChatGPT desktop app did not display it correctly. The fix was simple: set the display scale to `1`, and the candidate window returned immediately without changing Fcitx5 or ChatGPT configuration:

```lua
hl.monitor({
  output = "HDMI-A-1",
  mode = "1920x1080@200",
  position = "0x0",
  scale = 1,
})
```

When the candidate window works in a browser but not in a particular desktop application, display scaling is a useful first thing to check.

## Conclusion

At this point, the two major pain points Chinese users are likely to encounter when getting started with Omarchy have largely been addressed.

With networking and Chinese input in place, Omarchy's strengths can show through: it is open source and lightweight, and its integration of agents with the system feels natural. Many customizations that once required searching configuration files and documentation can be handed to an agent in natural language. This makes the customizability of Arch and Hyprland more approachable for people who are not already comfortable with the command line.

As a Linux system, it is also friendly to development. Shell commands, Docker, and similar tools run directly in a native environment without an additional compatibility layer. This setup is especially suitable for people who primarily develop but also want a good Steam gaming experience. The Steam ecosystem works normally, and support for NVIDIA graphics drivers is stable. I recommend enabling Steam Big Picture Mode; the experience can come quite close to SteamOS.

Omarchy still has gaps to fill, of course: Chinese localization is not yet available. I sincerely hope the project can address this in the near future, and I look forward to a better Omarchy.
