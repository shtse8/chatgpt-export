# ChatGPT Export

Export **all** your ChatGPT conversations to JSON — directly from your browser.

No extensions. No API keys. No dependencies. Just one script.

## Why?

- ChatGPT **Team/Business** plans have no built-in export feature
- The **Compliance API** is Enterprise-only
- OpenAI support redirects you to tools that don't exist for your plan
- Your data is yours — you should be able to download it

## Usage

1. Go to [chatgpt.com](https://chatgpt.com) and sign in
2. Open DevTools: **F12** (or **Cmd+Option+J** on Mac)
3. Click the **Console** tab
4. Copy the contents of [`chatgpt-export.js`](./chatgpt-export.js) and paste it
5. Press **Enter** and wait
6. A JSON file will automatically download when complete

That's it.

## Features

- 🔑 **Auto-authentication** — gets your token automatically, no manual copying
- 📄 **Full pagination** — exports all conversations, even thousands
- 🔄 **Auto-retry** — handles rate limits and temporary errors
- 🔃 **Token refresh** — automatically refreshes expired tokens mid-export
- 📊 **Progress tracking** — shows speed and ETA in console
- 💾 **Metadata** — includes export timestamp, account info, and stats
- 🛡️ **Error resilient** — continues on failures, reports errors at the end

## Works With

| Plan | Export Available? | This Tool |
|------|:-:|:-:|
| Free | ✅ (Settings → Export) | ✅ |
| Plus | ✅ (Settings → Export) | ✅ |
| Team | ❌ | ✅ |
| Business | ❌ | ✅ |
| Enterprise | ✅ (Compliance API) | ✅ |

## Output Format

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
      "mapping": { ... }
    }
  ]
}
```

Each conversation contains the full message tree in `mapping`, including all user messages, assistant responses, system messages, and tool outputs.

## Notes

- **Images/files**: The JSON contains URLs to images and uploaded files, not the actual binary data. These URLs may expire after some time.
- **Duration**: Exporting thousands of conversations may take 30-60+ minutes. Leave the tab open and let it run.
- **Rate limits**: The script automatically handles rate limiting with exponential backoff.
- **Token expiry**: Access tokens expire after ~10 days. If your export takes very long, the script will auto-refresh the token.
- **Large exports**: For very large accounts (10,000+ conversations), the JSON file may be hundreds of MB.

## Legal

This tool accesses your own data through your own authenticated browser session. It does not bypass any security measures — it simply automates what you could do manually by clicking through each conversation.

Under **GDPR** and **UK GDPR** (Article 15), you have the right to obtain a copy of your personal data. This tool helps you exercise that right.

## License

MIT — do whatever you want with it.
