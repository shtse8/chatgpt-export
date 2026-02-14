/**
 * ChatGPT Export - Export all your ChatGPT conversations
 * 
 * Usage:
 *   1. Go to https://chatgpt.com and sign in
 *   2. Open DevTools (F12) → Console
 *   3. Paste this entire script and press Enter
 *   4. Wait for it to finish — a JSON file will auto-download
 * 
 * Works with: Free, Plus, Team, Business, Enterprise accounts
 * 
 * @license MIT
 * @author Kyle Tse (https://github.com/shtse8)
 * @repository https://github.com/shtse8/chatgpt-export
 */

(async () => {
  'use strict';

  const BATCH_SIZE = 100;
  const LIST_DELAY_MS = 500;
  const DOWNLOAD_DELAY_MS = 300;
  const DOWNLOAD_BATCH = 3; // pause every N downloads
  const RETRY_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 2000;

  // ── Helpers ──────────────────────────────────────────────

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const log = (msg) => console.log(`[ChatGPT Export] ${msg}`);
  const warn = (msg) => console.warn(`[ChatGPT Export] ⚠️ ${msg}`);
  const error = (msg) => console.error(`[ChatGPT Export] ❌ ${msg}`);

  async function fetchWithRetry(url, options, attempts = RETRY_ATTEMPTS) {
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(url, options);
        if (res.ok) return res;
        if (res.status === 401) {
          warn('Token expired, refreshing...');
          const newSession = await fetch('/api/auth/session').then((r) => r.json());
          if (newSession.accessToken) {
            options.headers['authorization'] = 'Bearer ' + newSession.accessToken;
            log('Token refreshed');
            continue;
          }
        }
        if (res.status === 429) {
          const wait = Math.pow(2, i) * RETRY_DELAY_MS;
          warn(`Rate limited, waiting ${wait / 1000}s...`);
          await sleep(wait);
          continue;
        }
        if (i < attempts - 1) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        return res; // return last failed response
      } catch (e) {
        if (i < attempts - 1) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        throw e;
      }
    }
  }

  // ── Auth ─────────────────────────────────────────────────

  log('🔑 Getting session...');
  const session = await fetch('/api/auth/session').then((r) => r.json());

  if (!session.accessToken) {
    error('Not logged in. Please sign in to ChatGPT first.');
    return;
  }

  const token = session.accessToken;
  const accountId = session.account?.id;
  const planType = session.account?.planType || 'unknown';
  const userEmail = session.user?.email || 'unknown';

  log(`✅ Logged in as: ${userEmail} (${planType} plan)`);
  if (accountId) log(`📋 Account ID: ${accountId}`);

  const headers = { 'authorization': 'Bearer ' + token };
  if (accountId) headers['chatgpt-account-id'] = accountId;

  // ── Step 1: Fetch all conversation IDs ──────────────────

  log('📂 Fetching conversation list...');
  let allConvos = [];
  let offset = 0;

  while (true) {
    const url = `/backend-api/conversations?offset=${offset}&limit=${BATCH_SIZE}&order=updated`;
    const res = await fetchWithRetry(url, { headers });
    const data = await res.json();

    if (!data.items || data.items.length === 0) break;

    allConvos.push(...data.items);
    offset += data.items.length;
    log(`  Found ${allConvos.length} conversations so far...`);

    await sleep(LIST_DELAY_MS);
  }

  if (allConvos.length === 0) {
    warn('No conversations found.');
    return;
  }

  log(`📊 Total: ${allConvos.length} conversations to export`);

  // ── Step 2: Download each conversation ──────────────────

  log('⬇️  Downloading conversations...');
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < allConvos.length; i++) {
    const convo = allConvos[i];
    const progress = `[${i + 1}/${allConvos.length}]`;

    try {
      const res = await fetchWithRetry(
        `/backend-api/conversation/${convo.id}`,
        { headers }
      );

      if (res.ok) {
        const data = await res.json();
        results.push(data);
        successCount++;
      } else {
        warn(`${progress} ${convo.title || convo.id} → HTTP ${res.status}`);
        results.push({
          id: convo.id,
          title: convo.title,
          error: `HTTP ${res.status}`,
          create_time: convo.create_time,
          update_time: convo.update_time,
        });
        errorCount++;
      }
    } catch (e) {
      warn(`${progress} ${convo.title || convo.id} → ${e.message}`);
      results.push({
        id: convo.id,
        title: convo.title,
        error: e.message,
        create_time: convo.create_time,
        update_time: convo.update_time,
      });
      errorCount++;
    }

    // Progress update every 50
    if ((i + 1) % 50 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const rate = ((i + 1) / elapsed * 60).toFixed(0);
      log(`📈 Progress: ${i + 1}/${allConvos.length} (${rate}/min, ${elapsed}s elapsed)`);
    }

    // Rate limiting
    if (i % DOWNLOAD_BATCH === 0) await sleep(DOWNLOAD_DELAY_MS);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  // ── Step 3: Save to file ────────────────────────────────

  const exportData = {
    meta: {
      exported_at: new Date().toISOString(),
      user_email: userEmail,
      plan_type: planType,
      account_id: accountId,
      total_conversations: results.length,
      successful: successCount,
      errors: errorCount,
      export_duration_seconds: parseFloat(totalTime),
    },
    conversations: results,
  };

  const json = JSON.stringify(exportData, null, 2);
  const sizeMB = (json.length / 1024 / 1024).toFixed(1);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `chatgpt-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);

  // ── Summary ─────────────────────────────────────────────

  log('');
  log('═══════════════════════════════════════');
  log('✅ Export complete!');
  log(`📊 ${successCount} conversations exported (${errorCount} errors)`);
  log(`💾 File size: ${sizeMB} MB`);
  log(`⏱️  Time: ${totalTime}s`);
  log('═══════════════════════════════════════');
})();
