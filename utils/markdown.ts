import { parse as parseInline } from './markdownParser';
import katex from 'katex';

/**
 * Renders a LaTeX string as a block-level HTML string using KaTeX.
 */
const renderBlockMath = (latex: string): string => {
  try {
    const rendered = katex.renderToString(latex.trim(), {
      displayMode: true,
      throwOnError: false,
      strict: false,
    });
    return `<div style="overflow-x:auto;padding:12px 16px;margin:12px 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;text-align:center;">${rendered}</div>`;
  } catch {
    return `<pre style="padding:8px;background:#f9fafb;border-radius:6px;overflow-x:auto;">${latex}</pre>`;
  }
};

interface TreeNode {
    text: string;
    children: Tree | null;
}
interface Tree {
    type: 'ul' | 'ol';
    items: TreeNode[];
}

const buildListTree = (lines: string[]): Tree | null => {
    // Corrected logic: Filter blank lines ONCE and use that array consistently.
    const activeLines = lines.filter(line => line.trim() !== '');
    if (!activeLines || activeLines.length === 0) return null;

    const firstLine = activeLines[0].trim();
    const type = /^\d+\./.test(firstLine) ? 'ol' : 'ul';
    const items: TreeNode[] = [];
    const baseIndentation = activeLines[0].match(/^(\s*)/)?.[0].length || 0;

    let i = 0;
    while (i < activeLines.length) {
        const line = activeLines[i];
        const indentation = line.match(/^(\s*)/)?.[0].length || 0;
        
        if (indentation < baseIndentation) break;

        if (indentation === baseIndentation) {
            const text = line.trim().replace(/^(\*|-|\d+\.)\s/, '');
            const childLines: string[] = [];
            let j = i + 1;
            // The inner loop must find children from the SAME array
            while (j < activeLines.length) {
                const nextLine = activeLines[j];
                const nextIndentation = nextLine.match(/^(\s*)/)?.[0].length || 0;
                if (nextIndentation > baseIndentation) {
                    childLines.push(nextLine);
                } else { // Break if indentation is not greater
                    break;
                }
                j++;
            }
            items.push({ text, children: buildListTree(childLines) });
            i = j; // This is now correct and consistent
        } else {
            // This case should not be hit if logic is right, but it's a safe increment
            i++;
        }
    }
    return { type, items };
};

const renderTreeToHtml = (tree: Tree | null): string => {
    if (!tree || tree.items.length === 0) return '';
    const ListTag = tree.type;
    const listClass = tree.type === 'ol' ? 'list-decimal' : 'list-disc';
    let html = `<${ListTag} class="${listClass} list-outside pl-5 my-2 space-y-1">`;
    for (const node of tree.items) {
        html += `<li class="pl-1 my-1">${parseInline(node.text)}`;
        if (node.children) {
            html += renderTreeToHtml(node.children);
        }
        html += `</li>`;
    }
    html += `</${ListTag}>`;
    return html;
};

type Alignment = 'left' | 'center' | 'right';

const isDelimiterRow = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed.includes('|') || !trimmed.includes('-')) return false;
  return /^[\s|:\-]+$/.test(trimmed);
};

const parseTableFields = (line: string): string[] => {
  const parts = line.split('|');
  if (line.trim().startsWith('|')) {
    parts.shift();
  }
  if (line.trim().endsWith('|')) {
    parts.pop();
  }
  return parts.map(p => p.trim());
};

const parseAlignments = (delimiterLine: string): Alignment[] => {
  const fields = parseTableFields(delimiterLine);
  return fields.map(field => {
    const trimmed = field.trim();
    const alignLeft = trimmed.startsWith(':');
    const alignRight = trimmed.endsWith(':');
    if (alignLeft && alignRight) return 'center';
    if (alignRight) return 'right';
    return 'left';
  });
};

const getAlignmentClass = (alignment: Alignment): string => {
  if (alignment === 'center') return 'text-center';
  if (alignment === 'right') return 'text-right';
  return 'text-left';
};

export const markdownToHtml = (markdown: string): string => {
  if (!markdown) return '';

  let html = '';
  const lines = markdown.split('\n');
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];
  let blockquoteBuffer: string[] = [];
  let codeBuffer: string[] = [];
  let codeLang = '';
  let inCodeBlock = false;
  
  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      html += `<p class="my-2">${paragraphBuffer.map(line => parseInline(line)).join('<br>')}</p>`;
      paragraphBuffer = [];
    }
  };

  const flushList = () => {
    if (listBuffer.length > 0) {
      const tree = buildListTree(listBuffer);
      html += renderTreeToHtml(tree);
      listBuffer = [];
    }
  };
  
  const flushBlockquote = () => {
    if (blockquoteBuffer.length > 0) {
      const blockquoteHtml = markdownToHtml(blockquoteBuffer.join('\n'));
      html += `<blockquote class="pl-4 ml-2 my-2 border-l-4 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 italic">${blockquoteHtml}</blockquote>`;
      blockquoteBuffer = [];
    }
  };
  
  const flushCode = () => {
    if (codeBuffer.length > 0) {
      const code = codeBuffer.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const langLabel = codeLang ? `<div style="padding:2px 12px;background:#e5e7eb;font-size:0.75em;font-family:monospace;color:#6b7280;border-bottom:1px solid #d1d5db;">${codeLang}</div>` : '';
      html += `<div style="margin:12px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">${langLabel}<pre style="padding:12px;background:#f9fafb;overflow-x:auto;margin:0;"><code style="font-family:monospace;font-size:0.875em;color:#1f2937;white-space:pre;">${code}</code></pre></div>`;
      codeBuffer = [];
      codeLang = '';
    }
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushBlockquote();
    flushCode();
  };
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const isListItem = /^\s*(\*|-|\d+\.)\s/.test(line);

    // ── Code fence: ``` ────────────────────────────────────────
    if (trimmedLine.startsWith('```')) {
      if (!inCodeBlock) {
        flushAll();
        codeLang = trimmedLine.slice(3).trim();
        inCodeBlock = true;
      } else {
        inCodeBlock = false;
        flushCode();
      }
      i++;
      continue;
    }
    if (inCodeBlock) {
      codeBuffer.push(line);
      i++;
      continue;
    }

    // ── Block math: $$ ... $$ (multi-line) ─────────────────────
    if (trimmedLine === '$$') {
      flushAll();
      const mathLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '$$') {
        mathLines.push(lines[i]);
        i++;
      }
      i++; // consume closing $$
      html += renderBlockMath(mathLines.join('\n'));
      continue;
    }

    // ── Block math: $$...$$ single line ────────────────────────
    if (trimmedLine.startsWith('$$') && trimmedLine.endsWith('$$') && trimmedLine.length > 4) {
      flushAll();
      html += renderBlockMath(trimmedLine.slice(2, -2));
      i++;
      continue;
    }

    // ── Horizontal rule ────────────────────────────────────────
    if (/^(---|\*\*\*|___)\s*$/.test(trimmedLine)) {
      flushAll();
      html += '<hr style="margin:16px 0;border:none;border-top:1px solid #d1d5db;" />';
      i++;
      continue;
    }

    // Rule 0: Check if we are starting a table
    if (line.includes('|') && i + 1 < lines.length && isDelimiterRow(lines[i+1])) {
      flushAll();
      
      const headerLine = line;
      const delimiterLine = lines[i+1];
      
      const headers = parseTableFields(headerLine);
      const alignments = parseAlignments(delimiterLine);
      
      const bodyRows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].includes('|')) {
        bodyRows.push(parseTableFields(lines[j]));
        j++;
      }
      
      let tableHtml = '<div class="overflow-x-auto my-4 rounded-xl border border-gray-200 dark:border-gray-700/80 shadow-sm">';
      tableHtml += '<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700/80 text-sm">';
      
      // Header
      tableHtml += '<thead class="bg-gray-50 dark:bg-gray-800/50"><tr>';
      headers.forEach((header, idx) => {
        const alignmentClass = getAlignmentClass(alignments[idx]);
        tableHtml += `<th class="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100 border-r last:border-r-0 border-gray-200 dark:border-gray-700/80 ${alignmentClass}">${parseInline(header)}</th>`;
      });
      tableHtml += '</tr></thead>';
      
      // Body
      tableHtml += '<tbody class="divide-y divide-gray-200 dark:divide-gray-700/50 bg-white dark:bg-gray-800">';
      bodyRows.forEach((row) => {
        tableHtml += '<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">';
        headers.forEach((_, colIdx) => {
          const cellValue = row[colIdx] || '';
          const alignmentClass = getAlignmentClass(alignments[colIdx]);
          tableHtml += `<td class="px-4 py-3 text-gray-700 dark:text-gray-300 border-r last:border-r-0 border-gray-200/60 dark:border-gray-700/40 ${alignmentClass}">${parseInline(cellValue)}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table></div>';
      
      html += tableHtml;
      i = j;
      continue;
    }

    if (isListItem) {
      flushParagraph();
      flushBlockquote();
      listBuffer.push(line);
      i++;
      continue;
    }
    
    if (trimmedLine === '' && listBuffer.length > 0) {
      listBuffer.push(line);
      i++;
      continue;
    }
    
    flushList();
    
    if (trimmedLine.startsWith('>')) {
      flushParagraph();
      blockquoteBuffer.push(line.substring(line.indexOf('>') + 1).trimStart());
    } else if (trimmedLine.startsWith('#')) {
      flushAll();
      if (trimmedLine.startsWith('#### ')) html += `<h4 class="text-md font-semibold mt-2 mb-1">${parseInline(trimmedLine.substring(5))}</h4>`;
      else if (trimmedLine.startsWith('### ')) html += `<h3 class="text-lg font-semibold mt-3 mb-1">${parseInline(trimmedLine.substring(4))}</h3>`;
      else if (trimmedLine.startsWith('## ')) html += `<h2 class="text-xl font-semibold mt-4 mb-2">${parseInline(trimmedLine.substring(3))}</h2>`;
      else if (trimmedLine.startsWith('# ')) html += `<h1 class="text-2xl font-bold mt-5 mb-3">${parseInline(trimmedLine.substring(2))}</h1>`;
      else paragraphBuffer.push(line);
    } else if (trimmedLine !== '') {
      flushBlockquote();
      paragraphBuffer.push(line);
    } else {
      flushAll();
    }
    i++;
  }

  flushAll();
  return html;
};

export const markdownToPlainText = (markdown: string): string => {
  if (!markdown) return '';
  return markdown
    .replace(/^#+\s+/gm, '')
    .replace(/^\s*[\*-]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/(\*\*\*|\*\*|\*)/g, '');
};

export { parse as parseInline } from './markdownParser';