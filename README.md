# 💬 ChatGPT Export

### Export all your ChatGPT conversations to JSON

[![CI](https://github.com/shtse8/chatgpt-export/actions/workflows/ci.yml/badge.svg)](https://github.com/shtse8/chatgpt-export/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/shtse8/chatgpt-export)](https://github.com/shtse8/chatgpt-export/stargazers)

No extensions required. No API keys. No dependencies. Works with **Team/Business** plans that have no built-in export.

## ✨ Why?

- ChatGPT **Team/Business** plans have **no built-in export** feature
- The Compliance API is **Enterprise-only**
- OpenAI support redirects you to tools that don't exist
- **Your data is yours** — you should be able to download it

## 📦 Installation

Choose your preferred method:

### 🧩 Chrome Extension (Recommended)

> Coming soon to Chrome Web Store

For now, install from source:
1. Download the [latest release ZIP](https://github.com/shtse8/chatgpt-export/releases/latest)
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the extracted folder
5. Navigate to [chatgpt.com](https://chatgpt.com) → click the extension icon

### 🐒 Userscript (Tampermonkey / Violentmonkey)

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
2. Click to install: **[chatgpt-export.user.js](https://github.com/shtse8/chatgpt-export/releases/latest/download/chatgpt-export.user.js)**
3. Navigate to [chatgpt.com](https://chatgpt.com) — a floating widget appears in the bottom-right

### 🔖 Bookmarklet

1. Download [bookmarklet.html](https://github.com/shtse8/chatgpt-export/releases/latest/download/bookmarklet.txt) from the latest release
2. Create a new bookmark in your browser
3. Paste the contents as the URL
4. Click the bookmark while on [chatgpt.com](https://chatgpt.com)

### 📋 Script Injection (Console Paste)

1. Go to [chatgpt.com](https://chatgpt.com) and sign in
2. Open DevTools: **F12** → **Console** tab
3. Copy the contents of [`inject.js`](https://github.com/shtse8/chatgpt-export/releases/latest/download/inject.js)
4. Paste and press **Enter**
5. Wait for the JSON file to auto-download

## 🎯 Features

- 🔑 **Auto-authentication** — gets your session token automatically
- 📄 **Full pagination** — exports all conversations, even thousands
- 🔄 **Auto-retry** with exponential backoff on rate limits
- 🔃 **Token refresh** — handles expired tokens mid-export
- 📊 **Progress tracking** — speed, count, and status in real-time
- 💾 **Auto-download** — JSON file saves automatically when done
- 🛡️ **Error resilient** — continues on failures, reports errors at the end
- 🎨 **Popup UI** (extension) or **floating widget** (userscript) — no console needed

## 📊 Works With

| Plan | Built-in Export? | This Tool |
|------|:---:|:---:|
| Free | ✅ | ✅ |
| Plus | ✅ | ✅ |
| Team | ❌ | ✅ |
| Business | ❌ | ✅ |
| Enterprise | ✅ (Compliance API) | ✅ |

## 📄 Output Format

```json
{
  "meta": {
    "exported_at": "2026-02-14T15:00:00.000Z",
    "user_email": "user@example.com",
    "plan_type": "team",
    "total_conversations": 1234,
    "successful": 1230,
    "errors": 4,
    "export_duration_seconds": 600
  },
  "conversations": [
    {
      "title": "My Conversation",
      "create_time": 1700000000,
      "mapping": { "..." }
    }
  ]
}
```

## 🔧 Development

```bash
# Install dependencies
bun install

# Build all formats (extension + standalone + userscript + bookmarklet)
bun run build

# Type check
bun run typecheck

# Lint
bun run lint

# Package extension as ZIP
bun run package
```

### Project Structure

```
src/
├── core/           # Shared TypeScript export engine
│   ├── config.ts
│   ├── export-engine.ts
│   └── utils.ts
├── extension/      # Chrome extension (MV3)
│   ├── manifest.json
│   ├── background.ts
│   ├── content.ts
│   └── popup/
├── standalone/     # Console injection IIFE
│   └── inject.ts
└── userscript/     # Tampermonkey script with floating UI
    └── chatgpt-export.user.ts
```

## 🚀 Releasing

```bash
# Bump version in package.json, then:
git tag v1.0.1
git push origin v1.0.1
```

GitHub Actions will automatically:
1. Build all formats
2. Create a GitHub Release with all artifacts
3. Upload to Chrome Web Store (if secrets configured)

See [docs/CHROME_WEB_STORE_SETUP.md](docs/CHROME_WEB_STORE_SETUP.md) for CWS setup.

## 📝 Notes

- **Duration**: Exporting thousands of conversations may take 30-60+ minutes
- **Rate limits**: Handled automatically with exponential backoff
- **Images/files**: JSON contains URLs (may expire), not binary data
- **Large exports**: 10,000+ conversations → hundreds of MB

## ⚖️ Legal

This tool accesses your own data through your own authenticated browser session. Under **GDPR** and **UK GDPR** (Article 15), you have the right to obtain a copy of your personal data.

## 📄 License

MIT © [Kyle Tse](https://github.com/shtse8)
