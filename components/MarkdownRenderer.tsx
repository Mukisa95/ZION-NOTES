import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// ─────────────────────────────────────────────────────────────
// KaTeX math renderer components
// ─────────────────────────────────────────────────────────────
const BlockMath: React.FC<{ latex: string }> = ({ latex }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(latex.trim(), ref.current, {
          displayMode: true,
          throwOnError: false,
          trust: false,
          strict: false,
        });
      } catch {
        if (ref.current) ref.current.textContent = latex;
      }
    }
  }, [latex]);
  return (
    <div
      ref={ref}
      className="my-4 overflow-x-auto py-2 px-4 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 text-center katex-block"
    />
  );
};

const InlineMath: React.FC<{ latex: string }> = ({ latex }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(latex.trim(), ref.current, {
          displayMode: false,
          throwOnError: false,
          trust: false,
          strict: false,
        });
      } catch {
        if (ref.current) ref.current.textContent = `$${latex}$`;
      }
    }
  }, [latex]);
  return <span ref={ref} className="katex-inline" />;
};

// ─────────────────────────────────────────────────────────────
// Inline parser: bold / italic / inline-math / inline-code
// ─────────────────────────────────────────────────────────────
const parseInline = (text: string, keyPrefix: string): React.ReactNode => {
  // Split on: $...$ (inline math), `...` (code), ***...*** , **...** , *...*
  const regex = /(\$[^$\n]+?\$|`[^`]+`|\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*)/g;
  const parts = text.split(regex);

  return parts.filter(Boolean).map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const latex = part.slice(1, -1);
      return <InlineMath key={key} latex={latex} />;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={key}
          className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-[0.85em] font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
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

// ─────────────────────────────────────────────────────────────
// List tree builder (unchanged logic)
// ─────────────────────────────────────────────────────────────
interface TreeNode {
  text: string;
  children: Tree | null;
}
interface Tree {
  type: 'ul' | 'ol';
  items: TreeNode[];
}

const buildListTree = (lines: string[], indentSize = 2): Tree | null => {
  lines = lines.filter(line => line.trim() !== '');
  if (!lines || lines.length === 0) return null;

  const firstLine = lines[0].trim();
  const type = /^\d+\./.test(firstLine) ? 'ol' : 'ul';

  const items: TreeNode[] = [];
  const baseIndentation = lines[0].match(/^(\s*)/)?.[0].length || 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const indentation = line.match(/^(\s*)/)?.[0].length || 0;

    if (indentation < baseIndentation) break;

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
      items.push({ text, children: buildListTree(childLines, indentSize) });
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

// ─────────────────────────────────────────────────────────────
// Table helpers (unchanged)
// ─────────────────────────────────────────────────────────────
type Alignment = 'left' | 'center' | 'right';

const isDelimiterRow = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed.includes('|') || !trimmed.includes('-')) return false;
  return /^[\s|:\-]+$/.test(trimmed);
};

const parseTableFields = (line: string): string[] => {
  const parts = line.split('|');
  if (line.trim().startsWith('|')) parts.shift();
  if (line.trim().endsWith('|')) parts.pop();
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

// ─────────────────────────────────────────────────────────────
// Main MarkdownRenderer
// ─────────────────────────────────────────────────────────────
export const MarkdownRenderer: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
  if (!content) return null;

  const elements: React.ReactNode[] = [];
  const lines = content.split('\n');
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];
  let blockquoteBuffer: string[] = [];
  let codeBuffer: string[] = [];
  let codeLang = '';
  let inCodeBlock = false;

  const flushParagraph = (key: string) => {
    if (paragraphBuffer.length > 0) {
      const pContent = paragraphBuffer.map((line, i) => (
        <React.Fragment key={i}>
          {parseInline(line, `p-${key}-line-${i}`)}
          {i < paragraphBuffer.length - 1 && <br />}
        </React.Fragment>
      ));
      elements.push(<p key={key}>{pContent}</p>);
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
      const bqContent = <MarkdownRenderer content={blockquoteBuffer.join('\n')} />;
      elements.push(
        <blockquote key={key} className="pl-4 ml-2 my-2 border-l-4 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 italic">
          {bqContent}
        </blockquote>
      );
      blockquoteBuffer = [];
    }
  };

  const flushCode = (key: string) => {
    if (codeBuffer.length > 0) {
      const code = codeBuffer.join('\n');
      elements.push(
        <div key={key} className="my-3 rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
          {codeLang && (
            <div className="px-4 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 font-mono border-b border-gray-200 dark:border-gray-700">
              {codeLang}
            </div>
          )}
          <pre className="p-4 bg-gray-50 dark:bg-gray-800/80 overflow-x-auto">
            <code className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre">{code}</code>
          </pre>
        </div>
      );
      codeBuffer = [];
      codeLang = '';
    }
  };

  const flushAll = (key: string) => {
    flushParagraph(key);
    flushList(key);
    flushBlockquote(key);
    flushCode(key);
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // ── Code fence ────────────────────────────────────────────
    if (trimmedLine.startsWith('```')) {
      if (!inCodeBlock) {
        flushAll(`pre-code-${i}`);
        codeLang = trimmedLine.slice(3).trim();
        inCodeBlock = true;
      } else {
        inCodeBlock = false;
        flushCode(`code-${i}`);
      }
      i++;
      continue;
    }
    if (inCodeBlock) {
      codeBuffer.push(line);
      i++;
      continue;
    }

    // ── Block math: $$ ... $$ ─────────────────────────────────
    if (trimmedLine === '$$') {
      flushAll(`pre-bmath-${i}`);
      const mathLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '$$') {
        mathLines.push(lines[i]);
        i++;
      }
      i++; // consume closing $$
      elements.push(<BlockMath key={`bmath-${i}`} latex={mathLines.join('\n')} />);
      continue;
    }

    // Single-line block math: $$...$$
    if (trimmedLine.startsWith('$$') && trimmedLine.endsWith('$$') && trimmedLine.length > 4) {
      flushAll(`pre-bmath-inline-${i}`);
      const latex = trimmedLine.slice(2, -2);
      elements.push(<BlockMath key={`bmath-inline-${i}`} latex={latex} />);
      i++;
      continue;
    }

    // ── Horizontal rule ───────────────────────────────────────
    if (/^(\-\-\-|\*\*\*|___)\s*$/.test(trimmedLine)) {
      flushAll(`hr-${i}`);
      elements.push(<hr key={`hr-${i}`} className="my-4 border-t border-gray-300 dark:border-gray-600" />);
      i++;
      continue;
    }

    // ── Table ─────────────────────────────────────────────────
    if (line.includes('|') && i + 1 < lines.length && isDelimiterRow(lines[i + 1])) {
      flushAll(`table-${i}`);
      const headerLine = line;
      const delimiterLine = lines[i + 1];
      const headers = parseTableFields(headerLine);
      const alignments = parseAlignments(delimiterLine);
      const bodyRows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].includes('|')) {
        bodyRows.push(parseTableFields(lines[j]));
        j++;
      }
      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-4 rounded-xl border border-gray-200 dark:border-gray-700/80 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700/80 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {headers.map((header, idx) => (
                  <th
                    key={`th-${idx}`}
                    className={`px-4 py-3 font-semibold text-gray-900 dark:text-gray-100 border-r last:border-r-0 border-gray-200 dark:border-gray-700/80 ${getAlignmentClass(alignments[idx])}`}
                  >
                    {parseInline(header, `th-text-${idx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
              {bodyRows.map((row, rowIdx) => (
                <tr key={`tr-${rowIdx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  {headers.map((_, colIdx) => {
                    const cellValue = row[colIdx] || '';
                    return (
                      <td
                        key={`td-${rowIdx}-${colIdx}`}
                        className={`px-4 py-3 text-gray-700 dark:text-gray-300 border-r last:border-r-0 border-gray-200/60 dark:border-gray-700/40 ${getAlignmentClass(alignments[colIdx])}`}
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

    const isListItem = /^\s*(\*|-|\d+\.)\s/.test(line);

    // ── List item ─────────────────────────────────────────────
    if (isListItem) {
      flushParagraph(`p-${i}`);
      flushBlockquote(`bq-${i}`);
      listBuffer.push(line);
      i++;
      continue;
    }

    // Blank line continuing a list
    if (trimmedLine === '' && listBuffer.length > 0) {
      listBuffer.push(line);
      i++;
      continue;
    }

    flushList(`l-${i}`);

    // ── Blockquote ────────────────────────────────────────────
    if (trimmedLine.startsWith('>')) {
      flushParagraph(`p-${i}`);
      flushBlockquote(`bq-${i}`);
      blockquoteBuffer.push(line.substring(line.indexOf('>') + 1).trimStart());
    }
    // ── Headings ──────────────────────────────────────────────
    else if (trimmedLine.startsWith('#')) {
      flushAll(`all-${i}`);
      const key = `h-${i}`;
      if (trimmedLine.startsWith('#### ')) {
        elements.push(<h4 key={key} className="text-base font-bold mt-4 mb-1 text-gray-800 dark:text-gray-100">{parseInline(trimmedLine.substring(5), `${key}-text`)}</h4>);
      } else if (trimmedLine.startsWith('### ')) {
        elements.push(<h3 key={key} className="text-lg font-bold mt-5 mb-2 text-gray-800 dark:text-gray-100">{parseInline(trimmedLine.substring(4), `${key}-text`)}</h3>);
      } else if (trimmedLine.startsWith('## ')) {
        elements.push(<h2 key={key} className="text-xl font-bold mt-5 mb-2 text-gray-800 dark:text-gray-100">{parseInline(trimmedLine.substring(3), `${key}-text`)}</h2>);
      } else if (trimmedLine.startsWith('# ')) {
        elements.push(<h1 key={key} className="text-2xl font-bold mt-5 mb-3 text-gray-800 dark:text-gray-100">{parseInline(trimmedLine.substring(2), `${key}-text`)}</h1>);
      } else {
        paragraphBuffer.push(line);
      }
    }
    // ── Paragraph ─────────────────────────────────────────────
    else if (trimmedLine !== '') {
      flushBlockquote(`bq-${i}`);
      paragraphBuffer.push(line);
    } else {
      flushParagraph(`p-${i}`);
      flushBlockquote(`bq-${i}`);
    }

    i++;
  }

  flushAll('final');

  return <div className={className}>{elements}</div>;
};