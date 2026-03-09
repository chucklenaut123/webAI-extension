// Sidebar logic for WebAI Extension

// ============================================
// CONFIGURATION: Modify this URL for your deployment
// ============================================
const WORKER_URL = 'https://your-worker.your-subdomain.workers.dev';
// ============================================

let chatHistory = [];
let currentModel = 'zhipu';

const texts = {
  title: 'WebAI Extension',
  welcome: 'Hello! I can help you:',
  feature1: 'Quickly summarize page content',
  feature2: 'Extract key points',
  feature3: 'Explain content in detail',
  feature4: 'General Q&A conversation',
  hint: 'Click the buttons below or enter your question directly!',
  inputPlaceholder: 'Enter your question...',
  usePageContent: 'Use page content',
  send: 'Send',
  summarize: 'Summarize',
  extract: 'Key Points',
  explain: 'Explain',
  prompts: {
    summarize: 'Please summarize the main content of this page',
    extract: 'Please extract the key points from this page',
    explain: 'Please explain the content of this page in detail'
  },
  errorNoContent: 'Unable to get page content, please refresh the page and try again',
  errorFetch: 'Unable to connect to AI service. Please check your Worker URL configuration.',
  errorNotConfigured: 'API key not configured. Please set the corresponding API key in Cloudflare Dashboard.',
  streamInterrupted: 'Stream interrupted',
  errorWorkerUrl: 'Please configure Worker URL in sidebar.js'
};

const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const usePageContentCheckbox = document.getElementById('usePageContent');
const actionBtns = document.querySelectorAll('.action-btn');
const closeBtn = document.getElementById('closeBtn');
const modelSelect = document.getElementById('modelSelect');
const settingsBtn = document.getElementById('settingsBtn');

if (typeof marked !== 'undefined') {
  marked.setOptions({ breaks: true, gfm: true });
}

function renderMarkdown(text) {
  if (typeof marked === 'undefined') return text;
  
  const mathBlocks = [];
  const mathInlines = [];
  
  let processed = text
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, p1) => {
      mathBlocks.push(p1);
      return `%%MATH_BLOCK_${mathBlocks.length - 1}%%`;
    })
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, p1) => {
      mathBlocks.push(p1);
      return `%%MATH_BLOCK_${mathBlocks.length - 1}%%`;
    })
    .replace(/\\\((.*?)\\\)/g, (_, p1) => {
      mathInlines.push(p1);
      return `%%MATH_INLINE_${mathInlines.length - 1}%%`;
    });
  
  let html = marked.parse(processed);
  
  return html
    .replace(/%%MATH_BLOCK_(\d+)%%/g, (_, i) => `$$${mathBlocks[i]}$$`)
    .replace(/%%MATH_INLINE_(\d+)%%/g, (_, i) => `\\(${mathInlines[i]}\\)`);
}

function renderMath(element) {
  if (typeof renderMathInElement === 'undefined') return;
  renderMathInElement(element, {
    delimiters: [
      {left: '$$', right: '$$', display: true},
      {left: '\\[', right: '\\]', display: true},
      {left: '\\(', right: '\\)', display: false}
    ],
    throwOnError: false
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const savedModel = localStorage.getItem('webai_model');
  if (savedModel) {
    currentModel = savedModel;
    modelSelect.value = savedModel;
  }
  
  sendBtn.addEventListener('click', sendMessage);
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  modelSelect.addEventListener('change', (e) => {
    currentModel = e.target.value;
    localStorage.setItem('webai_model', currentModel);
  });
  
  actionBtns.forEach(btn => {
    btn.addEventListener('click', () => handleQuickAction(btn.dataset.action));
  });
  
  closeBtn.addEventListener('click', () => window.close());
  
  settingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  });
});

function loadPageContent(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (!tabs[0]) {
      callback(null);
      return;
    }
    
    const tryGetContent = (retryCount = 0) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getPageContent' }, async (response) => {
        if (chrome.runtime.lastError) {
          if (retryCount === 0) {
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content.js']
              });
              setTimeout(() => tryGetContent(1), 100);
            } catch (e) {
              callback(null);
            }
          } else {
            callback(null);
          }
          return;
        }
        callback(response?.content || null);
      });
    };
    
    tryGetContent();
  });
}

function handleQuickAction(action) {
  userInput.value = texts.prompts[action];
  userInput.focus();
}

function sendMessage() {
  const message = userInput.value.trim();
  if (!message || sendBtn.disabled) return;
  
  sendBtn.disabled = true;
  userInput.disabled = true;
  
  addMessage(message, 'user');
  userInput.value = '';
  
  if (usePageContentCheckbox.checked) {
    loadPageContent((content) => {
      if (content) {
        const contextMessage = `Based on the following page content, answer the question:\n\n${content}\n\nUser question: ${message}`;
        sendRequestToWorker('chat', contextMessage);
      } else {
        sendRequestToWorker('chat', message);
      }
    });
  } else {
    sendRequestToWorker('chat', message);
  }
}

async function sendRequestToWorker(action, content) {
  try {
    if (!WORKER_URL || WORKER_URL.includes('your-worker')) {
      throw new Error(texts.errorWorkerUrl);
    }
    
    const customPrompt = localStorage.getItem('webai_system_prompt') || '';
    
    const requestBody = { action, model: currentModel, stream: true };
    
    if (customPrompt) {
      requestBody.systemPrompt = customPrompt;
    }
    
    if (action === 'chat') {
      if (chatHistory.length > 0) {
        requestBody.messages = chatHistory.map(m => ({ role: m.role, content: m.content }));
      }
      requestBody.message = content;
    } else {
      requestBody.content = content;
    }
    
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      await handleStreamResponse(response, action, content);
    } else {
      const data = await response.json();
      if (data.success) {
        addMessage(data.response, 'assistant');
        updateChatHistory(action, content, data.response);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    }
  } catch (error) {
    console.error('AI Reader Error:', error);
    let errorMsg = error.message;
    if (errorMsg.includes('Failed to fetch')) {
      errorMsg = texts.errorFetch;
    } else if (errorMsg.includes('not configured')) {
      errorMsg = texts.errorNotConfigured;
    } else if (errorMsg.includes('Worker URL')) {
      errorMsg = texts.errorWorkerUrl;
    } else if (errorMsg.includes('HTTP')) {
      errorMsg = `Service error: ${errorMsg}. Please check your Worker configuration and API key.`;
    }
    addMessage(`Error: ${errorMsg}`, 'error');
  } finally {
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
  }
}

async function handleStreamResponse(response, action, userContent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant streaming';
  
  let mainContent = '';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  messageDiv.appendChild(contentDiv);
  
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'typing-indicator';
  typingIndicator.innerHTML = '<span></span><span></span><span></span>';
  contentDiv.appendChild(typingIndicator);
  
  chatContainer.appendChild(messageDiv);
  
  const welcomeMessage = chatContainer.querySelector('.welcome-message');
  if (welcomeMessage) welcomeMessage.remove();
  
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  let buffer = '';
  let isFirstChunk = true;
  let renderTimeout = null;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
        
        const data = trimmedLine.slice(6).trim();
        if (data === '[DONE]') break;
        
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta;
          
          const content = delta?.content;
          if (content) {
            if (isFirstChunk) {
              typingIndicator.remove();
              isFirstChunk = false;
            }
            mainContent += content;
            
            if (renderTimeout) clearTimeout(renderTimeout);
            renderTimeout = setTimeout(() => {
              contentDiv.innerHTML = renderMarkdown(mainContent);
              renderMath(contentDiv);
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }, 50);
          }
        } catch (e) {}
      }
    }
    
    if (renderTimeout) clearTimeout(renderTimeout);
    
    if (mainContent) {
      contentDiv.innerHTML = renderMarkdown(mainContent);
      renderMath(contentDiv);
    }
    
    messageDiv.classList.remove('streaming');
    updateChatHistory(action, userContent, mainContent);
  } catch (error) {
    typingIndicator.remove();
    if (mainContent) {
      contentDiv.innerHTML = renderMarkdown(mainContent + '\n\n[Stream interrupted]');
      renderMath(contentDiv);
    } else {
      contentDiv.innerHTML = renderMarkdown('[Stream interrupted]');
      renderMath(contentDiv);
    }
    messageDiv.classList.remove('streaming');
  }
}

function updateChatHistory(action, userContent, assistantContent) {
  if (action === 'chat' && assistantContent) {
    chatHistory.push({ role: 'user', content: userContent });
    chatHistory.push({ role: 'assistant', content: assistantContent });
    if (chatHistory.length > 10) {
      chatHistory = chatHistory.slice(-10);
    }
  }
}

function addMessage(content, role) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  if (role === 'assistant' || role === 'error') {
    contentDiv.innerHTML = renderMarkdown(content);
    renderMath(contentDiv);
  } else {
    contentDiv.textContent = content;
  }
  
  messageDiv.appendChild(contentDiv);
  chatContainer.appendChild(messageDiv);
  
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  const welcomeMessage = chatContainer.querySelector('.welcome-message');
  if (welcomeMessage) welcomeMessage.remove();
}
