/**
 * ============================================
 * Cloudflare Worker for WebAI Extension
 * ============================================
 * 
 * This worker acts as a proxy between the browser extension and AI APIs.
 * It handles API key management, request formatting, and streaming responses.
 * 
 * Supported AI Providers:
 * - Zhipu AI: GLM-4.7-flash
 * - Groq: llama-3.1-8b-instant
 * 
 * Configuration:
 * Set the following secrets in Cloudflare Dashboard:
 * - ZHIPU_API_KEYS: Comma-separated Zhipu AI API keys
 * - GROQ_API_KEYS: Comma-separated Groq API keys
 * 
 * @see https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json();
      const { action, model, messages, message, content, stream, systemPrompt } = body;

      const selectedModel = model || 'zhipu';
      const api = getModelConfig(selectedModel, env);
      
      if (!api) {
        throw new Error('Model not configured. Please check API key configuration in Cloudflare Dashboard.');
      }

      const chatMessage = message || content;
      
      const actionPrompts = {
        summarize: 'Summarize:\n\n',
        extract: 'Extract key points:\n\n',
        explain: 'Explain simply:\n\n'
      };

      let promptMessages;
      if (action === 'chat' && messages?.length > 0) {
        promptMessages = formatMessages(messages, chatMessage, systemPrompt);
      } else if (action === 'chat' && chatMessage) {
        promptMessages = formatMessages(null, chatMessage, systemPrompt);
      } else if (actionPrompts[action] && content) {
        promptMessages = formatMessages(null, actionPrompts[action] + content, systemPrompt);
      } else {
        return new Response(JSON.stringify({ success: false, error: 'Invalid request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      if (stream !== false) {
        const response = await makeStreamRequest(api, promptMessages, 0);
        return new Response(response.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      const response = await makeRequest(api, promptMessages);
      return new Response(JSON.stringify({ success: true, response }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }
};

const FORMAT_GUIDE = 'Use Markdown formatting. For math formulas: block formulas use $$...$$, inline formulas use \\(...\\).';

function getModelConfig(model, env) {
  const configs = {
    zhipu: {
      keys: env?.ZHIPU_API_KEYS?.split(',').map(k => k.trim()).filter(Boolean) || [],
      baseUrl: 'https://api.z.ai/api/paas/v4/chat/completions',
      model: 'glm-4.7-flash'
    },
    groq: {
      keys: env?.GROQ_API_KEYS?.split(',').map(k => k.trim()).filter(Boolean) || [],
      baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.1-8b-instant'
    }
  };
  
  const config = configs[model];
  if (!config || config.keys.length === 0) return null;
  
  config.maxRetries = config.keys.length;
  return config;
}

function formatMessages(history, currentMessage, customPrompt) {
  const rolePrompt = customPrompt || 'You are a helpful AI assistant.';
  const systemPrompt = `${rolePrompt}\n\n${FORMAT_GUIDE}`;
  const messages = [{ role: 'system', content: systemPrompt }];
  
  if (history) {
    messages.push(...history.map(m => ({ role: m.role, content: m.content })));
  }
  
  if (currentMessage) {
    messages.push({ role: 'user', content: currentMessage });
  }
  
  return messages;
}

async function makeStreamRequest(api, messages, retryCount = 0) {
  const keyIndex = retryCount % api.keys.length;
  const apiKey = api.keys[keyIndex];
  
  if (!apiKey) {
    throw new Error('No API keys configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const requestBody = { model: api.model, messages, stream: true };
    
    const response = await fetch(api.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch (e) {
        if (errorText) errorMessage = errorText;
      }
      
      if (retryCount < api.maxRetries - 1) {
        return makeStreamRequest(api, messages, retryCount + 1);
      }
      throw new Error(errorMessage);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    
    if (retryCount < api.maxRetries - 1) {
      return makeStreamRequest(api, messages, retryCount + 1);
    }
    throw error;
  }
}

async function makeRequest(api, messages, retryCount = 0) {
  const keyIndex = retryCount % api.keys.length;
  const apiKey = api.keys[keyIndex];
  
  if (!apiKey) {
    throw new Error('No API keys configured');
  }

  const requestBody = { model: api.model, messages };

  const response = await fetch(api.baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
    } catch (e) {
      if (errorText) errorMessage = errorText;
    }
    
    if (retryCount < api.maxRetries - 1) {
      return makeRequest(api, messages, retryCount + 1);
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  if (data.error) {
    if (retryCount < api.maxRetries - 1) {
      return makeRequest(api, messages, retryCount + 1);
    }
    throw new Error(data.error.message || 'API error');
  }
  
  return data.choices[0].message.content;
}
