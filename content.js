/**
 * Content script for WebAI Extension
 * Extracts page content for AI analysis
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    sendResponse({ content: extractPageContent() });
  }
  return true;
});

/**
 * Extract main content from the current page
 * Uses multiple selectors to find the main content area
 * @returns {string} Extracted and cleaned page content
 */
function extractPageContent() {
  const selectors = ['article', 'main', '[role="main"]', '.content', '.article', '#content', '#article', 'body'];
  
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      return cleanText(el.textContent);
    }
  }
  
  return cleanText(document.documentElement.textContent);
}

/**
 * Clean and truncate text content
 * @param {string} text - Raw text to clean
 * @returns {string} Cleaned text (max 10000 characters)
 */
function cleanText(text) {
  if (!text) return '';
  
  let cleaned = text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(function.*?\{[\s\S]*?\})|(var.*?=.*?;)/gi, '');
  
  return cleaned.length > 10000 ? cleaned.substring(0, 10000) + '...' : cleaned;
}
