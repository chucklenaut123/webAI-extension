/**
 * Background Service Worker for WebAI Extension
 * Handles extension lifecycle and content script injection
 */

// Handle extension icon click - open sidebar
chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch (error) {
      // Content script may already be injected
    }
    
    chrome.sidePanel.open({ windowId: tab.windowId });
  } else {
    // Fallback for browsers without sidePanel API
    chrome.tabs.create({ url: chrome.runtime.getURL('sidebar.html') });
  }
});

// Enable side panel to open on action click
if (chrome.sidePanel) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}
