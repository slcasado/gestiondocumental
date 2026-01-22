export const copyToClipboard = async (text) => {
  // Try modern Clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, method: 'clipboard-api' };
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback method:', err);
    }
  }

  // Fallback to older method
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      return { success: true, method: 'execCommand' };
    } else {
      throw new Error('execCommand failed');
    }
  } catch (err) {
    console.error('All clipboard methods failed:', err);
    return { success: false, error: err };
  }
};
