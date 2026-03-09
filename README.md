# WebAI Extension

<div align="center">

![WebAI Extension](icons/icon128.png)

**A browser extension template that brings AI-powered reading assistance to your fingertips**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome](https://img.shields.io/badge/Chrome-Compatible-green.svg)](https://www.google.com/chrome/)
[![Edge](https://img.shields.io/badge/Edge-Compatible-green.svg)](https://www.microsoft.com/edge/)

</div>

---

## Overview

WebAI Extension is a production-ready browser extension template for AI-powered web interaction. It provides a sidebar interface for summarization, explanation, and Q&A on any webpage.

**Two Ways to Use:**
- 🚀 **Deploy as-is**: Configure your API keys and start using immediately
- 🛠️ **Customize & Extend**: Use as a foundation to build your own AI browser extension

## Features

- 🚀 **Quick Actions**: One-click summarize, extract key points, or explain page content
- 💬 **Chat Interface**: Natural conversation with AI about the current page
- 🌊 **Streaming Responses**: Real-time streaming output for faster interaction
- ⚙️ **Customizable**: Custom system prompts
- 📦 **Production Ready**: Complete with Cloudflare Worker backend

## Supported AI Models

| Provider | Model | API Endpoint |
|----------|-------|--------------|
| **Zhipu AI** | GLM-4.7-flash | api.z.ai (International) |
| **Groq** | llama-3.1-8b-instant | api.groq.com |

## Architecture

```
┌─────────────────┐
│ Browser Extension│
│   (sidebar.js)  │
└────────┬────────┘
         │ HTTPS POST
         ▼
┌─────────────────┐
│ Cloudflare Worker│
│   (worker.js)   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│Zhipu AI│ │ Groq  │
└───────┘ └───────┘
```

The Worker acts as a secure proxy, keeping your API keys safe and handling request routing.

---

## Quick Start

### Prerequisites

- Chrome or Edge browser
- A Cloudflare account (free tier works)
- API keys from [Zhipu AI](https://open.bigmodel.cn) and/or [Groq](https://console.groq.com)

### Installation

#### Step 1: Clone the repository

```bash
git clone https://github.com/your-username/webai-extension.git
cd webai-extension
```

#### Step 2: Configure Worker URL

Open `sidebar.js` and modify the `WORKER_URL` constant at the top:

```javascript
// ============================================
// CONFIGURATION: Modify this URL for your deployment
// ============================================
const WORKER_URL = 'https://your-worker.your-subdomain.workers.dev';
// ============================================
```

#### Step 3: Deploy the Worker

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy the worker
wrangler deploy
```

After deployment, you'll get a Worker URL like:
```
https://webai-extension.your-subdomain.workers.dev
```

**Important**: Update this URL in `sidebar.js`!

#### Step 4: Configure API Keys

**IMPORTANT: Never commit API keys to the repository!**

Go to Cloudflare Dashboard → Workers & Pages → your-worker → Settings → Variables

Add the following secrets with **Encrypt** option checked:

| Variable Name | Description |
|---------------|-------------|
| `ZHIPU_API_KEYS` | Zhipu AI API keys (comma-separated for multiple) |
| `GROQ_API_KEYS` | Groq API keys (comma-separated for multiple) |

**Getting API Keys:**

- **Zhipu AI**: Visit [Zhipu AI Open Platform](https://open.bigmodel.cn) → Console → API Key Management → Create API key
- **Groq**: Visit [Groq Console](https://console.groq.com) → API Keys → Create API key

#### Step 5: Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the project folder

---

## Project Structure

```
webai-extension/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker for extension
├── content.js             # Content script for page interaction
├── sidebar.html           # Sidebar UI
├── sidebar.js             # Sidebar logic (configure WORKER_URL here)
├── sidebar.css            # Sidebar styles
├── settings.html          # Settings page UI
├── settings.js            # Settings page logic
├── settings.css           # Settings page styles
├── worker.js              # Cloudflare Worker backend
├── wrangler.toml          # Cloudflare Worker configuration
├── lib/                   # Third-party libraries
│   ├── marked.min.js      # Markdown parser
│   ├── katex.min.js       # Math formula renderer
│   └── katex.min.css      # KaTeX styles
└── icons/                 # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Configuration

### Worker URL

Edit `sidebar.js` to set your Cloudflare Worker URL:

```javascript
const WORKER_URL = 'https://your-worker.your-subdomain.workers.dev';
```

### System Prompt

Customize AI behavior via the Settings page (right-click extension icon → Options).

### Worker Configuration

Edit `wrangler.toml` to customize your worker:

```toml
name = "ai-reader-assistant"
main = "worker.js"
compatibility_date = "2024-02-28"

# Optional: Add your account ID
# account_id = "your-account-id"
```

---

## Testing

### Feature Testing Checklist

#### Basic Functions
- [ ] Extension icon appears in toolbar
- [ ] Clicking icon opens sidebar
- [ ] Sidebar interface displays correctly
- [ ] Welcome message shows properly

#### Quick Action Buttons
- [ ] "Summarize" button - summarizes page content
- [ ] "Key Points" button - extracts key points
- [ ] "Explain" button - explains content in detail

#### Chat Functionality
- [ ] Type and send a question
- [ ] Receive AI response
- [ ] Chat history displays correctly
- [ ] Can continue the conversation

#### Page Content Feature
- [ ] "Use page content" checkbox works
- [ ] Can ask questions based on page content when checked
- [ ] Normal chat when unchecked

### Quick Test Script

Test if your Worker is working by running this in the browser console:

```javascript
fetch('https://webai-extension.your-subdomain.workers.dev', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'chat',
    model: 'zhipu',
    message: 'Hello, please introduce yourself'
  })
})
.then(r => r.json())
.then(d => console.log(d))
.catch(e => console.error(e));
```

---

## Troubleshooting

### "Please configure Worker URL in sidebar.js" Error

- Open `sidebar.js` and set the `WORKER_URL` constant to your deployed Worker URL

### "Failed to fetch" Error

- Check if Worker URL is correct in `sidebar.js`
- Verify the Worker is deployed and accessible
- Check browser console for CORS errors

### "Model not configured" Error

- Verify secrets are set in Cloudflare Dashboard
- Ensure secret names match exactly (`ZHIPU_API_KEYS`, `GROQ_API_KEYS`)
- Wait 1-2 minutes for secrets to propagate

### Worker Returns 401/403

- API key may be invalid or expired
- Check API key status on provider's platform
- Regenerate and update the key

### Clicking extension icon does nothing

- Check if extension is loaded (visit `chrome://extensions/`)
- Refresh the extension (click refresh button on extension card)
- Restart the browser

### Failed to get page content

- Refresh the page and try again
- Some special pages (like `chrome://`) cannot be accessed

---

## Adding New AI Providers

To add a new AI provider, modify the `getModelConfig` function in `worker.js`:

```javascript
function getModelConfig(model, env) {
  const configs = {
    // Existing providers...
    
    // Add new provider
    openai: {
      keys: env?.OPENAI_API_KEYS?.split(',').map(k => k.trim()).filter(Boolean) || [],
      baseUrl: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini'
    }
  };
  // ...
}
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Zhipu AI](https://www.zhipuai.cn/) for GLM models
- [Groq](https://groq.com/) for fast inference
- [Marked.js](https://marked.js.org/) for Markdown parsing
- [KaTeX](https://katex.org/) for math rendering

---

<div align="center">

**Made with ❤️ for better reading experience**

</div>
