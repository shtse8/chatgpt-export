# Chrome Web Store API Setup Guide

One-time setup to enable automatic publishing via GitHub Actions.

## What You Need

Configure these four secrets in the GitHub repository:

| Secret | What it is |
|--------|-----------|
| `CHROME_EXTENSION_ID` | Your extension's ID from CWS |
| `CHROME_CLIENT_ID` | Google OAuth2 client ID |
| `CHROME_CLIENT_SECRET` | Google OAuth2 client secret |
| `CHROME_REFRESH_TOKEN` | OAuth2 refresh token (long-lived) |

## Step 1: Get Your Extension ID

Your extension ID is in the Chrome Web Store URL:
```
https://chromewebstore.google.com/detail/chatgpt-export/elkdhnegeooliobekanjpdifoaoolbbf
                                                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                                                    This is your EXTENSION_ID
```

## Step 2: Enable Chrome Web Store API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "Chrome Extension CI")
3. In the search bar, type **"Chrome Web Store API"**
4. Click **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Select **External** → Create
3. Fill in:
   - App name: `Chrome Extension CI`
   - User support email: your email
   - Developer contact: your email
4. Click **Save and Continue** through Scopes (skip)
5. Add your email to **Test users**
6. Save

## Step 4: Create OAuth Client Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `Chrome Extension CI`
5. Under **Authorized redirect URIs**, add:
   ```
   https://developers.google.com/oauthplayground
   ```
6. Click **Create**
7. **Save the Client ID and Client Secret** — you'll need them

## Step 5: Get Refresh Token

### Option A: OAuth Playground (Recommended)

1. Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the **⚙️ gear icon** (top right)
3. Check **"Use your own OAuth credentials"**
4. Enter your **Client ID** and **Client Secret**
5. In the left panel, find **"Input your own scopes"** and enter:
   ```
   https://www.googleapis.com/auth/chromewebstore
   ```
6. Click **Authorize APIs**
7. Sign in with the Google account that owns the extension
8. Click **"Exchange authorization code for tokens"**
9. **Copy the Refresh Token** from the response

### Option B: CLI Helper (Alternative)

```bash
npx chrome-webstore-upload-keys
```
This opens a browser flow and outputs all 3 values automatically.

## Step 6: Add Secrets to GitHub

1. Go to your GitHub repo → **Settings → Secrets and variables → Actions**
2. Click **New repository secret** for each:
   - `CHROME_EXTENSION_ID` = `elkdhnegeooliobekanjpdifoaoolbbf`
   - `CHROME_CLIENT_ID` = (from Step 4)
   - `CHROME_CLIENT_SECRET` = (from Step 4)
   - `CHROME_REFRESH_TOKEN` = (from Step 5)

Also add the non-secret **Actions variable** `CWS_PUBLISHER_ID`: copy the publisher ID from the Chrome Web Store developer dashboard URL. The current API requires it in addition to the extension ID.

The workflow passes OAuth credentials through `CLIENT_ID`, `CLIENT_SECRET` and `REFRESH_TOKEN` environment variables. The current publishing CLI rejects credential command-line flags.

## Step 7: Test It

```bash
# Bump version in package.json (CI syncs to manifest automatically)
# Then tag and push:
git tag v1.1.0
git push origin v1.1.0
```

GitHub Actions will:
1. ✅ Build the extension
2. ✅ Create a GitHub Release with the ZIP
3. ✅ Upload to Chrome Web Store
4. ✅ Submit for review (auto-publish)

Check the **Actions** tab in your repo to see the workflow run.

## Troubleshooting

### "Upload failed: 403"
- Make sure the Google account that generated the refresh token is the **owner** of the extension on CWS
- Verify the Chrome Web Store API is enabled in your GCP project

### "Token expired"  
- Refresh tokens don't expire normally, but if you revoke access, generate a new one via Step 5

### "Version already exists"
- Bump the version in `package.json` before tagging — the build script syncs it to `manifest.json`

### "Item not found"
- Double-check your `CHROME_EXTENSION_ID` matches exactly

For an existing tag, use the Release workflow's manual `tag` input. It checks out and builds that tag while retaining the current publication tooling. The workflow reads live store status first, skips a version already published or awaiting review, and stops if another submission is in flight. Publishing failures fail the job; the GitHub Release remains available separately. A successful submission is not proof that store review is complete.

## How the Release Workflow Works

```
git tag v1.2.0 && git push --tags
         │
         ▼
┌─────────────────────────┐
│  GitHub Actions trigger  │
│  on: push: tags: v*      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  1. bun install          │
│  2. bun run build        │
│  3. zip extension        │
└────────┬────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────────────┐
│ GitHub │ │ Chrome Web Store  │
│Release │ │ Upload → Publish  │
│  ZIP   │ │ (if secrets set)  │
└────────┘ └──────────────────┘
```

If CWS secrets are not configured, the workflow still creates the GitHub Release — the store step is skipped. When configured, a failed store submission fails the job.

## Important Notes

- **Review time**: After upload+publish, Google reviews the extension (usually 1-2 business days)
- **Version must increase**: Every upload needs a higher version number
- **2FA required**: Your Google account must have 2-step verification enabled
- **One extension per ID**: Each `CHROME_EXTENSION_ID` maps to exactly one CWS listing
