/**
 * Settings page logic for WebAI Extension
 */

const DEFAULT_PROMPT = 'You are a helpful AI assistant.';

document.addEventListener('DOMContentLoaded', () => {
  const systemPromptInput = document.getElementById('systemPromptInput');
  const resetPromptBtn = document.getElementById('resetPromptBtn');
  const saveBtn = document.getElementById('saveBtn');
  
  const savedPrompt = localStorage.getItem('webai_system_prompt') || '';
  systemPromptInput.value = savedPrompt;
  
  resetPromptBtn.addEventListener('click', () => {
    systemPromptInput.value = DEFAULT_PROMPT;
  });
  
  saveBtn.addEventListener('click', () => {
    const customPrompt = systemPromptInput.value.trim();
    if (customPrompt) {
      localStorage.setItem('webai_system_prompt', customPrompt);
    } else {
      localStorage.removeItem('webai_system_prompt');
    }
    
    saveBtn.textContent = 'Settings saved!';
    saveBtn.style.background = '#10b981';
    
    setTimeout(() => {
      saveBtn.textContent = 'Save';
      saveBtn.style.background = '';
    }, 2000);
  });
});
