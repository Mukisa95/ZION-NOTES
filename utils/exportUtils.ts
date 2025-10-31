import { exportAsDocx } from '../services/docxService';

/**
 * Modern File System Access API helper
 * Shows native "Save As" dialog with location and filename picker
 */
const saveWithPicker = async (blob: Blob, suggestedName: string, accept: Record<string, string[]>): Promise<boolean> => {
    try {
        // Check if File System Access API is supported
        if ('showSaveFilePicker' in window) {
            console.log('✅ File System Access API available, showing native picker...');
            const handle = await (window as any).showSaveFilePicker({
                suggestedName,
                types: [{
                    description: 'File',
                    accept,
                }],
            });
            console.log('✅ User selected location, saving file...');
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            console.log('✅ File saved successfully!');
            return true;
        } else {
            console.log('❌ File System Access API not supported in this browser');
        }
    } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name === 'AbortError') {
            console.log('ℹ️ User cancelled the save dialog');
        } else {
            console.log('⚠️ File picker error:', err);
        }
        return false;
    }
    return false;
};

/**
 * Triggers a browser download for a given Blob and filename.
 * Fallback for browsers that don't support File System Access API
 */
const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const A4_STYLES = `
    <style>
        @media print {
            @page {
                size: A4;
                margin: 2cm;
            }
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        body {
            font-family: sans-serif;
            line-height: 1.6;
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 2cm;
            box-sizing: border-box;
            border: 1px solid #ddd;
            box-shadow: 0 0 5px rgba(0,0,0,0.1);
            background-color: white;
            color: black;
        }
        img { max-width: 100%; height: auto; }
        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        blockquote { border-left: 4px solid #ccc; padding-left: 1em; margin-left: 0; color: #666; }
        .dark, [class*="dark:"] {
            display: none;
        }
    </style>
`;

/**
 * Converts an HTML string to a plain text string.
 */
const htmlToText = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    // Replace block elements with newlines for better readability
    tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, br').forEach(el => {
        el.insertAdjacentText('afterend', '\n');
    });
    return tempDiv.textContent || '';
};

/**
 * Converts an HTML string to a Markdown string.
 */
const htmlToMarkdown = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const convertNode = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent || '';
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return '';
        }

        const el = node as HTMLElement;
        let childrenMarkdown = Array.from(el.childNodes).map(convertNode).join('');

        switch (el.tagName) {
            case 'H1': return `# ${childrenMarkdown}\n\n`;
            case 'H2': return `## ${childrenMarkdown}\n\n`;
            case 'H3': return `### ${childrenMarkdown}\n\n`;
            case 'H4': return `#### ${childrenMarkdown}\n\n`;
            case 'P': return `${childrenMarkdown}\n\n`;
            case 'STRONG':
            case 'B': return `**${childrenMarkdown}**`;
            case 'EM':
            case 'I': return `*${childrenMarkdown}*`;
            case 'UL': return `${childrenMarkdown.trim()}\n\n`;
            case 'OL': return `${childrenMarkdown.trim()}\n\n`;
            case 'LI': {
                const parent = el.parentElement;
                const indent = '  '.repeat(getNestingLevel(el, ['UL', 'OL']));
                if (parent && parent.tagName === 'OL') {
                    const index = Array.from(parent.children).indexOf(el) + 1;
                    return `${indent}${index}. ${childrenMarkdown.trim()}\n`;
                }
                return `${indent}* ${childrenMarkdown.trim()}\n`;
            }
            case 'BR': return '\n';
            case 'IMG': {
                const img = el as HTMLImageElement;
                return `![${img.alt}](${img.src})`;
            }
            case 'A': {
                const a = el as HTMLAnchorElement;
                return `[${childrenMarkdown}](${a.href})`;
            }
            // FIX: Cast 'el' to HTMLTableElement to access table-specific properties like 'rows' and 'cells'.
            case 'TABLE': {
                 const tableEl = el as HTMLTableElement;
                 const rows = Array.from(tableEl.rows);
                 if (rows.length === 0) return '';

                 const headRow = rows[0];
                 const header = `| ${Array.from(headRow.cells).map(c => c.textContent?.trim() || ' ').join(' | ')} |\n`;
                 const separator = `| ${Array.from(headRow.cells).map(() => '---').join(' | ')} |\n`;
                 
                 const body = rows.slice(1).map(row => 
                     `| ${Array.from(row.cells).map(c => c.textContent?.trim() || ' ').join(' | ')} |`
                 ).join('\n');

                 return `${header}${separator}${body}\n\n`;
            }
            case 'SUP': return `<sup>${childrenMarkdown}</sup>`;
            case 'SUB': return `<sub>${childrenMarkdown}</sub>`;
            default: return childrenMarkdown;
        }
    };
    
    const getNestingLevel = (el: HTMLElement, tags: string[]): number => {
        let level = 0;
        let parent = el.parentElement;
        while(parent) {
            if (tags.includes(parent.tagName)) {
                level++;
            }
            parent = parent.parentElement;
        }
        return level;
    };

    return Array.from(tempDiv.childNodes).map(convertNode).join('').trim();
};

const getHtmlContent = (content: string, title: string) => {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            ${A4_STYLES}
        </head>
        <body>
            ${content}
        </body>
        </html>
    `;
}

/**
 * Exports the note content as a self-contained HTML file.
 */
export const exportAsHtml = async (content: string, filename: string, fileHandle?: any) => {
    const html = getHtmlContent(content, filename.replace('.html', ''));
    const blob = new Blob([html], { type: 'text/html' });
    
    if (fileHandle) {
        // Use provided file handle
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        console.log('✅ HTML saved to selected location');
    } else {
        // Fallback to download
        triggerDownload(blob, filename);
    }
};

/**
 * Exports the note content as a Markdown file.
 */
export const exportAsMarkdown = async (content: string, filename: string, fileHandle?: any) => {
    const markdown = htmlToMarkdown(content);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    
    if (fileHandle) {
        // Use provided file handle
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        console.log('✅ Markdown saved to selected location');
    } else {
        // Fallback to download
        triggerDownload(blob, filename);
    }
};

/**
 * Exports the note content as a plain text file.
 */
export const exportAsText = async (content: string, filename: string, fileHandle?: any) => {
    const text = htmlToText(content);
    const blob = new Blob([text], { type: 'text/plain' });
    
    if (fileHandle) {
        // Use provided file handle
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        console.log('✅ Text file saved to selected location');
    } else {
        // Fallback to download
        triggerDownload(blob, filename);
    }
};

/**
 * Exports the note content as a PDF file by leveraging the browser's print functionality.
 */
export const exportAsPdf = (content: string, filename: string) => {
    const html = getHtmlContent(content, filename.replace('.pdf', ''));
    
    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    
    document.body.appendChild(iframe);

    // Get the iframe's document object
    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
        console.error("Could not access iframe document to print.");
        document.body.removeChild(iframe);
        return;
    }

    // Write the HTML content to the iframe
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Set an onload handler for the iframe
    iframe.onload = () => {
        // Use a small timeout to ensure the browser has rendered the content
        setTimeout(() => {
            if (iframe.contentWindow) {
                iframe.contentWindow.focus(); // Focus is needed for some browsers
                iframe.contentWindow.print(); // Trigger the print dialog
            }
            // Clean up the iframe after a delay. This gives the user time to interact with the print dialog.
            setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 100); 
    };
};

/**
 * Exports the note content as a Word document (.docx file).
 */
export const exportAsWord = async (content: string, filename: string, fileHandle?: any) => {
    await exportAsDocx(content, filename, fileHandle);
};