# Setup: do this once, ideally the night before

About 15 minutes. At the end you'll have git, access to this repo, and your AI coding tool working in it.
Stuck? Paste this page's link into ChatGPT or Claude and ask it to walk you through, or ask in the team chat.

## 1. GitHub account and access

1. If you don't have a GitHub account, create one at https://github.com/signup
2. Send your GitHub username in the team's Messenger chat, so you can be added to the repo.
3. Accept the invitation. It arrives by email, or open https://github.com/Tilihub/space-apps-2026/invitations

## 2. Install git

- **Windows:** install Git for Windows from https://git-scm.com/downloads (the default options are fine).
- **macOS:** open Terminal and run `git --version`. If git isn't installed, macOS offers to install it. Accept.
- **Linux (Debian, Ubuntu, Mint):** `sudo apt install git`

## 3. Install the GitHub CLI and log in

Install `gh` from https://cli.github.com

- Windows: `winget install --id GitHub.cli`
- macOS: `brew install gh` (needs Homebrew), or download it from the site
- Linux: `sudo apt install gh`

Open a new terminal and run:

```
gh auth login
```

Choose **GitHub.com**, then **HTTPS**, answer **Yes** to authenticating git, and log in with the browser.

## 4. Install your AI coding tool

**If you have Claude Pro: Claude Code.** Instructions: https://code.claude.com/docs/en/setup (desktop app or terminal).

- macOS / Linux: `curl -fsSL https://claude.ai/install.sh | bash`
- Windows (PowerShell): `irm https://claude.ai/install.ps1 | iex`

Then run `claude` and log in with your Claude account.

**If you have a paid ChatGPT plan: Codex.** Instructions: https://learn.chatgpt.com/docs/codex/cli (desktop app, VS Code extension or terminal).

- macOS / Linux: `curl -fsSL https://chatgpt.com/codex/install.sh | sh`
- Windows: use the Windows tab on that page.

Then run `codex` and choose **Sign in with ChatGPT**.

The ChatGPT and Claude websites can't work in the repo for you. If that's all you'll use, see "Without an AI coding tool" below.

## 5. Get the repo

In a terminal, go to a normal folder on your computer, **not** one synced by OneDrive, Dropbox, iCloud or Google Drive (syncing breaks git). Then run:

```
gh repo clone Tilihub/space-apps-2026
cd space-apps-2026
```

## 6. Onboarding (this also tests that everything works)

Start your AI tool inside the `space-apps-2026` folder (`claude` or `codex` in the terminal, or open the folder in the desktop app) and say:

> Read AGENTS.md and do the onboarding.

It asks for your name, creates your own folder with your status file, and publishes it. You're done when your folder appears at https://github.com/Tilihub/space-apps-2026/tree/main/people

Your AI tool asks permission before running commands. That's normal: read what it wants to do, then approve.

## Without an AI coding tool

You can add your status file on the website:

1. Open https://github.com/Tilihub/space-apps-2026/blob/main/people/_template/status.md and copy its text.
2. Go to the `people` folder, click **Add file → Create new file**, type `<your-name>/status.md` as the name, paste the text and fill it in.
3. Click **Commit changes**, choose to create a new branch and start a pull request, then click **Create pull request** and **Merge pull request**.
