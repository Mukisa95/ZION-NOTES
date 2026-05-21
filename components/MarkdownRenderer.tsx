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

export const MarkdownRenderer: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
  if (!content) return null;

  const elements: React.ReactNode[] = [];
  const lines = content.split('\n');
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];
  let blockquoteBuffer: string[] = [];

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
  
  const flushAll = (key: string) => {
    flushParagraph(key);
    flushList(key);
    flushBlockquote(key);
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const isListItem = /^\s*(\*|-|\d+\.)\s/.test(line);

    // Rule 0: Check if we are starting a table
    if (line.includes('|') && i + 1 < lines.length && isDelimiterRow(lines[i+1])) {
      flushAll(`table-${i}`);
      
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
      
      const tableKey = `table-${i}`;
      elements.push(
        <div key={tableKey} className="overflow-x-auto my-4 rounded-xl border border-gray-200 dark:border-gray-700/80 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700/80 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {headers.map((header, idx) => {
                  const alignmentClass = getAlignmentClass(alignments[idx]);
                  return (
                    <th
                      key={`th-${idx}`}
                      className={`px-4 py-3 font-semibold text-gray-900 dark:text-gray-100 border-r last:border-r-0 border-gray-200 dark:border-gray-700/80 ${alignmentClass}`}
                    >
                      {parseInline(header, `th-text-${idx}`)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
              {bodyRows.map((row, rowIdx) => (
                <tr key={`tr-${rowIdx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  {headers.map((_, colIdx) => {
                    const cellValue = row[colIdx] || '';
                    const alignmentClass = getAlignmentClass(alignments[colIdx]);
                    return (
                      <td
                        key={`td-${rowIdx}-${colIdx}`}
                        className={`px-4 py-3 text-gray-700 dark:text-gray-300 border-r last:border-r-0 border-gray-200/60 dark:border-gray-700/40 ${alignmentClass}`}
                      >
                        {parseInline(cellValue, `td-text-${rowIdx}-${colIdx}`)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      
      i = j;
      continue;
    }

    // Rule 1: If it's a list item, add to the list buffer.
    if (isListItem) {
      flushParagraph(`p-${i}`);
      flushBlockquote(`bq-${i}`);
      listBuffer.push(line);
      i++;
      continue;
    }
    
    // Rule 2: If it's a blank line AND we're in a list context, add it to the list buffer.
    if (trimmedLine === '' && listBuffer.length > 0) {
      listBuffer.push(line);
      i++;
      continue;
    }
    
    // Rule 3: If we are here, the line is not a list item, and it is not a blank line continuing a list.
    // This means any active list must end.
    flushList(`l-${i}`);
    
    // Now process the current line as a new block type.
    if (trimmedLine.startsWith('>')) {
      flushParagraph(`p-${i}`);
      flushBlockquote(`bq-${i}`); // Flush previous before starting new one
      blockquoteBuffer.push(line.substring(line.indexOf('>') + 1).trimStart());
    } else if (trimmedLine.startsWith('#')) {
      flushAll(`all-${i}`);
      const key = `h-${i}`;
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
      flushBlockquote(`bq-${i}`);
      paragraphBuffer.push(line);
    } else {
      // This is a blank line that doesn't continue a list. Flush paragraphs.
      flushParagraph(`p-${i}`);
      flushBlockquote(`bq-${i}`);
    }
    i++;
  }

  flushAll(`final`);

  return <div className={className}>{elements}</div>;
};