chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return

  if (tab.url?.includes('chatgpt.com')) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle' })
  } else {
    chrome.tabs.create({ url: 'https://chatgpt.com' })
  }
})

// Badge updates from content script
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'progress' && sender.tab?.id) {
    const { downloaded, total, status } = message.data

    let text = ''
    let color = '#22c55e'

    if (status === 'listing') {
      text = '...'
      color = '#f59e0b'
    } else if (status === 'downloading' && total > 0) {
      text = String(downloaded)
      color = '#3b82f6'
    } else if (status === 'done') {
      text = '✓'
      color = '#22c55e'
    } else if (status === 'error') {
      text = '!'
      color = '#ef4444'
    }

    chrome.action.setBadgeText({ text, tabId: sender.tab.id })
    chrome.action.setBadgeBackgroundColor({ color, tabId: sender.tab.id })
  }
})
