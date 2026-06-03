import katex from 'katex';

/**
 * Parses inline markdown (bold, italic, inline-math, inline-code) and returns an HTML string.
 * Uses KaTeX renderToString so the output can be injected into a contenteditable document.
 */
export const parse = (text: string): string => {
  if (!text) return '';

  // Split on inline math $...$ FIRST before any other processing,
  // so we don't accidentally mangle LaTeX content with bold/italic replacements.
  const parts = text.split(/(\$[^$\n]+?\$)/g);

  return parts.map(part => {
    // Inline math: $...$
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const latex = part.slice(1, -1);
      try {
        return katex.renderToString(latex, {
          displayMode: false,
          throwOnError: false,
          strict: false,
        });
      } catch {
        return part;
      }
    }

    // Regular text — apply bold / italic / inline-code
    let html = part;

    // Inline code: `...`
    html = html.replace(/`([^`]+)`/g, '<code style="padding:1px 5px;border-radius:4px;background:#f3f4f6;font-family:monospace;font-size:0.875em;">$1</code>');

    // ***bold+italic*** (most specific first)
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');

    // **bold**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // *italic*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    return html;
  }).join('');
};
