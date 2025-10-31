/**
 * Parses inline markdown (bold, italic) and returns an HTML string.
 * This is a simplified implementation for this app's needs.
 */
export const parse = (text: string): string => {
  if (!text) return '';
  let html = text;

  // Important: Process the most specific patterns first (***) to avoid conflicts.
  
  // ***bold+italic***
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');

  // **bold**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // *italic*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
  return html;
};
