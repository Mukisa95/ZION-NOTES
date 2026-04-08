import { parse as parseInline } from './markdownParser';

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

export const markdownToHtml = (markdown: string): string => {
  if (!markdown) return '';

  let html = '';
  const lines = markdown.split('\n');
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];
  let blockquoteBuffer: string[] = [];
  let tableBuffer: string[] = [];
  
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
  
  const flushTable = () => {
    if (tableBuffer.length > 0) {
      let tableHtml = '<div class="overflow-x-auto my-4"><table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">';
      tableBuffer.forEach((row, i) => {
        let cells = row.split('|').map(c => c.trim());
        if (cells[0] === '') cells.shift();
        if (cells[cells.length - 1] === '') cells.pop();
        if (cells.every(c => c.match(/^[:-\\s]+$/))) {
          if (i === 1) tableHtml += '</thead><tbody class="divide-y divide-gray-200 dark:divide-gray-700">';
          return;
        }
        if (i === 0) {
          tableHtml += '<thead class="bg-gray-50 dark:bg-gray-800"><tr>';
          cells.forEach(c => tableHtml += `<th class="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider">${parseInline(c)}</th>`);
          tableHtml += '</tr>';
        } else {
          tableHtml += '<tr class="bg-white dark:bg-gray-900">';
          cells.forEach(c => tableHtml += `<td class="px-4 py-3 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700">${parseInline(c)}</td>`);
          tableHtml += '</tr>';
        }
      });
      tableHtml += tableBuffer.length > 1 ? '</tbody>' : '</thead>';
      tableHtml += '</table></div>';
      html += tableHtml;
      tableBuffer = [];
    }
  };
  
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushBlockquote();
    flushTable();
  };
  
  lines.forEach((line) => {
    const trimmedLine = line.trim();
    const isListItem = /^\s*(\*|-|\d+\.)\s/.test(line);

    if (isListItem) {
      flushParagraph();
      flushBlockquote();
      listBuffer.push(line);
      return;
    }
    
    if (trimmedLine === '' && listBuffer.length > 0) {
      listBuffer.push(line);
      return;
    }
    
    flushList();
    
    if (trimmedLine.startsWith('|')) {
      flushParagraph();
      flushBlockquote();
      tableBuffer.push(line);
      return;
    }
    
    flushTable();
    
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
  });

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