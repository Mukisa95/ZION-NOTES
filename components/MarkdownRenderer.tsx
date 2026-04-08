import React from 'react';

const parseInline = (text: string, keyPrefix: string): React.ReactNode => {
  const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*)/g;
  const parts = text.split(regex);

  return parts.filter(Boolean).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith('***') && part.endsWith('***')) {
      return <strong key={key}><em>{parseInline(part.slice(3, -3), `${key}-si`)}</em></strong>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{parseInline(part.slice(2, -2), `${key}-s`)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={key}>{parseInline(part.slice(1, -1), `${key}-i`)}</em>;
    }
    return part;
  });
};

interface TreeNode {
    text: string;
    children: Tree | null;
}
interface Tree {
    type: 'ul' | 'ol';
    items: TreeNode[];
}

const buildListTree = (lines: string[], indentSize = 2): Tree | null => {
    lines = lines.filter(line => line.trim() !== ''); // Filter out blank lines
    if (!lines || lines.length === 0) return null;

    const firstLine = lines[0].trim();
    const type = /^\d+\./.test(firstLine) ? 'ol' : 'ul';

    const items: TreeNode[] = [];
    const baseIndentation = lines[0].match(/^(\s*)/)?.[0].length || 0;

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const indentation = line.match(/^(\s*)/)?.[0].length || 0;
        
        if (indentation < baseIndentation) {
          break;
        }

        if (indentation === baseIndentation) {
            const text = line.trim().replace(/^(\*|-|\d+\.)\s/, '');
            const childLines: string[] = [];
            let j = i + 1;
            while (j < lines.length) {
                const nextIndentation = lines[j].match(/^(\s*)/)?.[0].length || 0;
                if (nextIndentation > baseIndentation) {
                    childLines.push(lines[j]);
                } else {
                    break;
                }
                j++;
            }
            
            items.push({
                text,
                children: buildListTree(childLines, indentSize)
            });
            i = j;
        } else {
            i++;
        }
    }
    return { type, items };
};


const renderTree = (tree: Tree | null, keyPrefix: string): React.ReactNode => {
    if (!tree || tree.items.length === 0) return null;

    const ListTag = tree.type === 'ol' ? 'ol' : 'ul';
    const listStyle = tree.type === 'ol' ? 'list-decimal' : 'list-disc';

    return (
        <ListTag key={keyPrefix} className={`${listStyle} list-outside space-y-1 pl-5`}>
            {tree.items.map((node, index) => (
                <li key={`${keyPrefix}-${index}`} className="pl-1">
                    {parseInline(node.text, `li-text-${keyPrefix}-${index}`)}
                    {renderTree(node.children, `${keyPrefix}-${index}`)}
                </li>
            ))}
        </ListTag>
    );
};


export const MarkdownRenderer: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
  if (!content) return null;

  const elements: React.ReactNode[] = [];
  const lines = content.split('\n');
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];
  let blockquoteBuffer: string[] = [];
  let tableBuffer: string[] = [];

  const flushParagraph = (key: string) => {
    if (paragraphBuffer.length > 0) {
      const content = paragraphBuffer.map((line, i) => (
        <React.Fragment key={i}>
          {parseInline(line, `p-${key}-line-${i}`)}
          {i < paragraphBuffer.length - 1 && <br />}
        </React.Fragment>
      ));
      elements.push(<p key={key}>{content}</p>);
      paragraphBuffer = [];
    }
  };

  const flushList = (key: string) => {
    if (listBuffer.length > 0) {
      const tree = buildListTree(listBuffer);
      elements.push(renderTree(tree, `list-${key}`));
      listBuffer = [];
    }
  };

  const flushBlockquote = (key: string) => {
    if (blockquoteBuffer.length > 0) {
      const blockquoteContent = <MarkdownRenderer content={blockquoteBuffer.join('\n')} />;
      elements.push(
        <blockquote key={key} className="pl-4 ml-2 my-2 border-l-4 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 italic">
          {blockquoteContent}
        </blockquote>
      );
      blockquoteBuffer = [];
    }
  };
  
  const flushTable = (key: string) => {
    if (tableBuffer.length > 0) {
      const rows = tableBuffer.map((row, i) => {
        let cells = row.split('|').map(c => c.trim());
        if (cells[0] === '') cells.shift();
        if (cells[cells.length - 1] === '') cells.pop();
        return { isSeparator: cells.every(c => c.match(/^[:-\\s]+$/)), cells, originalIndex: i };
      });
      
      const theadCells = rows[0].cells;
      const tBodyRows = rows.slice(1).filter(r => !r.isSeparator);
      
      elements.push(
        <div key={key} className="overflow-x-auto my-4 w-full">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {theadCells.map((c, idx) => (
                  <th key={idx} className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                    {parseInline(c, `table-${key}-th-${idx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tBodyRows.map((row, rIdx) => (
                <tr key={row.originalIndex} className="bg-white dark:bg-gray-900">
                  {row.cells.map((c, cIdx) => (
                    <td key={cIdx} className="px-4 py-3 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700">
                      {parseInline(c, `table-${key}-td-${rIdx}-${cIdx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableBuffer = [];
    }
  };
  
  const flushAll = (key: string) => {
    flushParagraph(key);
    flushList(key);
    flushBlockquote(key);
    flushTable(key);
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    const isListItem = /^\s*(\*|-|\d+\.)\s/.test(line);

    // Rule 1: If it's a list item, add to the list buffer.
    if (isListItem) {
      flushParagraph(`p-${index}`);
      flushBlockquote(`bq-${index}`);
      listBuffer.push(line);
      return;
    }
    
    // Rule 2: If it's a blank line AND we're in a list context, add it to the list buffer.
    if (trimmedLine === '' && listBuffer.length > 0) {
      listBuffer.push(line);
      return;
    }
    
    // Rule 3: If we are here, the line is not a list item, and it is not a blank line continuing a list.
    // This means any active list must end.
    flushList(`l-${index}`);
    
    if (trimmedLine.startsWith('|')) {
      flushParagraph(`p-${index}`);
      flushBlockquote(`bq-${index}`);
      tableBuffer.push(line);
      return;
    }
    
    flushTable(`tbl-${index}`);
    
    // Now process the current line as a new block type.
    if (trimmedLine.startsWith('>')) {
      flushParagraph(`p-${index}`);
      flushBlockquote(`bq-${index}`); // Flush previous before starting new one
      blockquoteBuffer.push(line.substring(line.indexOf('>') + 1).trimStart());
    } else if (trimmedLine.startsWith('#')) {
      flushAll(`all-${index}`);
      const key = `h-${index}`;
      if (trimmedLine.startsWith('#### ')) {
        elements.push(<h4 key={key}>{parseInline(trimmedLine.substring(5), `${key}-text`)}</h4>);
      } else if (trimmedLine.startsWith('### ')) {
        elements.push(<h3 key={key}>{parseInline(trimmedLine.substring(4), `${key}-text`)}</h3>);
      } else if (trimmedLine.startsWith('## ')) {
        elements.push(<h2 key={key}>{parseInline(trimmedLine.substring(3), `${key}-text`)}</h2>);
      } else if (trimmedLine.startsWith('# ')) {
        elements.push(<h1 key={key}>{parseInline(trimmedLine.substring(2), `${key}-text`)}</h1>);
      } else {
        paragraphBuffer.push(line);
      }
    } else if (trimmedLine !== '') {
      flushBlockquote(`bq-${index}`);
      paragraphBuffer.push(line);
    } else {
      // This is a blank line that doesn't continue a list. Flush paragraphs.
      flushParagraph(`p-${index}`);
      flushBlockquote(`bq-${index}`);
    }
  });

  flushAll(`final`);

  return <div className={className}>{elements}</div>;
};