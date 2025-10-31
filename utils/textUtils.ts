export const getCountsFromHtml = (html: string): { words: number; characters: number } => {
  if (!html) {
    return { words: 0, characters: 0 };
  }

  // Create a temporary DOM element to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Use textContent to get the plain text without any HTML tags
  const text = tempDiv.textContent || tempDiv.innerText || '';
  
  if (!text.trim()) {
    return { words: 0, characters: 0 };
  }

  // Calculate word count
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  
  // Calculate character count
  const characters = text.length;

  return { words, characters };
};
