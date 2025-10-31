import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ExternalHyperlink, Table, TableRow, TableCell, WidthType, convertInchesToTwip, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

/**
 * Reads a .docx file and converts it to HTML with proper image and table handling
 */
export const readDocxFile = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        
        // Configure mammoth to preserve images and ALL styling including lists
        const result = await mammoth.convertToHtml(
            { arrayBuffer },
            {
                convertImage: mammoth.images.imgElement(function(image) {
                    return image.read("base64").then(function(imageBuffer) {
                        const mimeType = image.contentType || 'image/png';
                        console.log('Successfully converting image:', mimeType, 'Size:', imageBuffer.length);
                        return {
                            src: "data:" + mimeType + ";base64," + imageBuffer
                        };
                    }).catch(function(error) {
                        console.error('Error converting image:', error);
                        return {
                            src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2UgRXJyb3I8L3RleHQ+PC9zdmc+'
                        };
                    });
                }),
                // Comprehensive style mapping - PRESERVE LISTS!
                styleMap: [
                    "p[style-name='Heading 1'] => h1:fresh",
                    "p[style-name='Heading 2'] => h2:fresh",
                    "p[style-name='Heading 3'] => h3:fresh",
                    "p[style-name='Heading 4'] => h4:fresh",
                    "p[style-name='Heading 5'] => h5:fresh",
                    "p[style-name='Heading 6'] => h6:fresh",
                    "r[style-name='Strong'] => strong",
                    "r[style-name='Emphasis'] => em",
                    // Preserve alignment
                    "p:left => p.align-left",
                    "p:center => p.align-center",
                    "p:right => p.align-right",
                    "p:justify => p.align-justify",
                    // Lists - critical for preserving bullets and numbers
                    "p:unordered-list(1) => ul > li:fresh",
                    "p:unordered-list(2) => ul > li > ul > li:fresh",
                    "p:ordered-list(1) => ol > li:fresh",
                    "p:ordered-list(2) => ol > li > ol > li:fresh",
                ],
                includeDefaultStyleMap: true,
                ignoreEmptyParagraphs: false,
                includeEmbeddedStyleMap: true,
            }
        );
        
        console.log('Mammoth conversion complete.');
        console.log('Messages:', result.messages);
        console.log('Raw HTML length:', result.value.length);
        
        // Log a sample of the HTML to see what mammoth produces
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = result.value;
        console.log('Mammoth produced lists (ul/ol):', tempDiv.querySelectorAll('ul, ol').length);
        console.log('Mammoth produced paragraphs:', tempDiv.querySelectorAll('p').length);
        console.log('Mammoth produced list items:', tempDiv.querySelectorAll('li').length);
        
        // Show first few paragraphs
        const sampleParas = Array.from(tempDiv.querySelectorAll('p')).slice(0, 15);
        console.log('Sample mammoth paragraphs:', sampleParas.map(p => p.textContent?.trim().substring(0, 30)));
        
        // Extract and process with DOCX library for better style preservation
        const processedHtml = await extractAndProcessWithDocx(arrayBuffer, result.value);
        
        return processedHtml;
    } catch (error) {
        console.error('Error reading .docx file:', error);
        throw new Error('Failed to read Word document');
    }
};


/**
 * Use JSZip to extract detailed formatting from DOCX
 */
const extractAndProcessWithDocx = async (arrayBuffer: ArrayBuffer, baseHtml: string): Promise<string> => {
    const imageDimensions: Array<{width: number, height: number}> = [];
    const textFormatting: Array<{fontSize?: string, alignment?: string, text?: string}> = [];
    const paragraphAlignments: Array<string> = [];
    let paragraphData: Array<{text: string, alignment: string, spacing?: {before?: number, after?: number}, isList?: boolean, listType?: 'bullet' | 'number', listStyle?: string, listLevel?: number, numId?: string}> = [];
    
    try {
        // Use JSZip to read the DOCX (which is a ZIP file)
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        // Read the numbering.xml to determine list types AND styles
        const numberingXml = await zip.file('word/numbering.xml')?.async('text');
        const numberingMap = new Map<string, {type: 'bullet' | 'number', style: string, format?: string}>();
        
        if (numberingXml) {
            const parser = new DOMParser();
            const numDoc = parser.parseFromString(numberingXml, 'text/xml');
            
            // First, extract abstract numbering definitions
            const abstractNums = numDoc.querySelectorAll('w\\:abstractNum, abstractNum');
            const abstractMap = new Map<string, {type: 'bullet' | 'number', style: string, format?: string}>();
            
            abstractNums.forEach(abstractNum => {
                const abstractId = abstractNum.getAttribute('w:abstractNumId') || abstractNum.getAttribute('abstractNumId');
                if (!abstractId) return;
                
                // Get the first level (level 0) formatting
                const lvl = abstractNum.querySelector('w\\:lvl[w\\:ilvl="0"], lvl[ilvl="0"]') || 
                            abstractNum.querySelector('w\\:lvl, lvl');
                
                if (lvl) {
                    const numFmt = lvl.querySelector('w\\:numFmt, numFmt');
                    const fmtVal = numFmt?.getAttribute('w:val') || numFmt?.getAttribute('val');
                    const lvlText = lvl.querySelector('w\\:lvlText, lvlText');
                    const lvlTextVal = lvlText?.getAttribute('w:val') || lvlText?.getAttribute('val');
                    
                    let type: 'bullet' | 'number' = 'number';
                    let style = 'decimal';
                    
                    // Map Word numbering formats to CSS
                    if (fmtVal === 'bullet') {
                        type = 'bullet';
                        style = 'disc';
                    } else if (fmtVal === 'decimal') {
                        type = 'number';
                        style = 'decimal';
                    } else if (fmtVal === 'lowerLetter') {
                        type = 'number';
                        style = 'lower-alpha';
                    } else if (fmtVal === 'upperLetter') {
                        type = 'number';
                        style = 'upper-alpha';
                    } else if (fmtVal === 'lowerRoman') {
                        type = 'number';
                        style = 'lower-roman';
                    } else if (fmtVal === 'upperRoman') {
                        type = 'number';
                        style = 'upper-roman';
                    } else {
                        type = 'number';
                        style = 'decimal';
                    }
                    
                    abstractMap.set(abstractId, { type, style, format: lvlTextVal || undefined });
                    console.log(`AbstractNum ${abstractId}: type=${type}, style=${style}, format=${lvlTextVal}`);
                }
            });
            
            // Now map actual numbering IDs to abstract definitions
            const nums = numDoc.querySelectorAll('w\\:num, num');
            nums.forEach(num => {
                const numId = num.getAttribute('w:numId') || num.getAttribute('numId');
                const abstractNumId = num.querySelector('w\\:abstractNumId, abstractNumId');
                
                if (numId && abstractNumId) {
                    const abstractId = abstractNumId.getAttribute('w:val') || abstractNumId.getAttribute('val');
                    
                    if (abstractId && abstractMap.has(abstractId)) {
                        const def = abstractMap.get(abstractId)!;
                        numberingMap.set(numId, def);
                        console.log(`Numbering ${numId} → ${def.type} (${def.style})`);
                    }
                }
            });
            
            console.log(`Total numbering definitions: ${numberingMap.size}`);
        }
        
        // Read the document.xml which contains all formatting
        const docXml = await zip.file('word/document.xml')?.async('text');
        
        if (docXml) {
            console.log('Successfully extracted document.xml for detailed formatting');
            // Parse XML to extract font sizes and other properties
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(docXml, 'text/xml');
            
            // Extract IMAGE DIMENSIONS from the XML
            const drawings = xmlDoc.querySelectorAll('w\\:drawing, drawing');
            drawings.forEach((drawing) => {
                const extent = drawing.querySelector('wp\\:extent, extent');
                if (extent) {
                    const cx = extent.getAttribute('cx');
                    const cy = extent.getAttribute('cy');
                    
                    if (cx && cy) {
                        const widthPx = Math.round((parseInt(cx) / 914400) * 96);
                        const heightPx = Math.round((parseInt(cy) / 914400) * 96);
                        
                        imageDimensions.push({
                            width: widthPx,
                            height: heightPx
                        });
                        
                        console.log(`Image dimensions extracted: ${widthPx}x${heightPx}px`);
                    }
                }
            });
            
            // Extract PARAGRAPH ALIGNMENTS, SPACING, and LIST INFORMATION
            const paragraphs = xmlDoc.querySelectorAll('w\\:p, p');
            // DON'T create a new paragraphData here - use the one declared at top!
            
            paragraphs.forEach((para) => {
                // Get alignment
                const jcElement = para.querySelector('w\\:jc, jc');
                let alignment = 'left';
                
                if (jcElement) {
                    const alignVal = jcElement.getAttribute('w:val') || jcElement.getAttribute('val');
                    alignment = alignVal || 'left';
                }
                
                // Get spacing information
                const spacingElement = para.querySelector('w\\:spacing, spacing');
                let spacing: {before?: number, after?: number} | undefined;
                
                if (spacingElement) {
                    const before = spacingElement.getAttribute('w:before') || spacingElement.getAttribute('before');
                    const after = spacingElement.getAttribute('w:after') || spacingElement.getAttribute('after');
                    
                    if (before || after) {
                        spacing = {};
                        if (before) spacing.before = parseInt(before);
                        if (after) spacing.after = parseInt(after);
                    }
                }
                
                // Check if this is a list item and get list type
                const numPr = para.querySelector('w\\:numPr, numPr');
                let isList = false;
                let listType: 'bullet' | 'number' | undefined;
                let listStyle: string | undefined;
                let listLevel = 0;
                let numId: string | undefined;
                
                if (numPr) {
                    isList = true;
                    
                    // Get list level
                    const ilvlElement = numPr.querySelector('w\\:ilvl, ilvl');
                    if (ilvlElement) {
                        const ilvl = ilvlElement.getAttribute('w:val') || ilvlElement.getAttribute('val');
                        listLevel = ilvl ? parseInt(ilvl) : 0;
                    }
                    
                    // Get numbering ID to determine type and style
                    const numIdElement = numPr.querySelector('w\\:numId, numId');
                    if (numIdElement) {
                        numId = numIdElement.getAttribute('w:val') || numIdElement.getAttribute('val') || undefined;
                        if (numId && numberingMap.has(numId)) {
                            const numDef = numberingMap.get(numId)!;
                            listType = numDef.type;
                            listStyle = numDef.style;
                        }
                    }
                }
                
                // Get text content of this paragraph
                const textElements = para.querySelectorAll('w\\:t, t');
                let paraText = '';
                textElements.forEach(t => {
                    paraText += (t.textContent || '').trim() + ' ';
                });
                paraText = paraText.trim();
                
                if (paraText || alignment !== 'left' || isList) {
                    paragraphData.push({ 
                        text: paraText, 
                        alignment: alignment,
                        spacing: spacing,
                        isList: isList,
                        listType: listType,
                        listStyle: listStyle,
                        listLevel: listLevel,
                        numId: numId
                    });
                    
                    if (alignment !== 'left') {
                        console.log(`Paragraph "${paraText.substring(0, 30)}..." has alignment: ${alignment}`);
                    }
                    if (isList) {
                        console.log(`List item (${listType} ${listStyle}, numId=${numId}, level ${listLevel}): "${paraText.substring(0, 30)}..."`);
                    }
                }
                
                // Also add to simple array for backward compatibility
                paragraphAlignments.push(alignment);
            });
            
            console.log('Paragraph data extracted:', paragraphData.length);
            console.log('List items found:', paragraphData.filter(p => p.isList).length);
            
            // Extract font sizes and text content from runs
            const runs = xmlDoc.querySelectorAll('w\\:r, r');
            runs.forEach((run) => {
                const formatting: {fontSize?: string, alignment?: string, text?: string} = {};
                
                // Get font size
                const szElement = run.querySelector('w\\:sz, sz');
                if (szElement) {
                    const halfPoints = szElement.getAttribute('w:val') || szElement.getAttribute('val');
                    if (halfPoints) {
                        const points = parseInt(halfPoints) / 2;
                        formatting.fontSize = `${points}pt`;
                    }
                }
                
                // Get text content
                const textElement = run.querySelector('w\\:t, t');
                if (textElement) {
                    formatting.text = textElement.textContent || '';
                }
                
                textFormatting.push(formatting);
            });
            
            console.log('Text formatting extracted:', textFormatting.length);
            console.log('Paragraph alignments extracted:', paragraphAlignments.length);
            console.log('Image dimensions extracted:', imageDimensions.length);
        }
    } catch (error) {
        console.warn('Could not extract detailed formatting:', error);
    }
    
    // Post-process the HTML with extracted formatting
    return postProcessHtml(baseHtml, imageDimensions, textFormatting, paragraphAlignments, paragraphData);
};

/**
 * Post-processes HTML to ensure proper styling for images and tables
 */
const postProcessHtml = (
    html: string, 
    imageDimensions: Array<{width: number, height: number}> = [], 
    textFormatting: Array<{fontSize?: string, alignment?: string, text?: string}> = [],
    paragraphAlignments: Array<string> = [],
    paragraphData: Array<{text: string, alignment: string, spacing?: {before?: number, after?: number}, isList?: boolean, listType?: 'bullet' | 'number', listStyle?: string, listLevel?: number, numId?: string}> = []
): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    console.log('Images found:', doc.querySelectorAll('img').length);
    console.log('Tables found:', doc.querySelectorAll('table').length);
    
    // Process images - preserve ALL attributes and styling with extracted dimensions
    const images = doc.querySelectorAll('img');
    images.forEach((img, index) => {
        console.log(`Image ${index}:`, {
            src: img.src?.substring(0, 50),
            width: img.getAttribute('width'),
            height: img.getAttribute('height'),
            style: img.getAttribute('style')
        });
        
        // Preserve existing inline styles
        const existingStyle = img.getAttribute('style') || '';
        
        // Get width and height from attributes or extracted dimensions
        let width = img.getAttribute('width');
        let height = img.getAttribute('height');
        
        // If no width/height from HTML, use extracted dimensions
        if (!width && !height && imageDimensions[index]) {
            width = imageDimensions[index].width.toString();
            height = imageDimensions[index].height.toString();
            console.log(`Applying extracted dimensions to image ${index}: ${width}x${height}px`);
        }
        
        // Build style string preserving original dimensions
        let styleString = existingStyle;
        
        // Add display block for better layout
        if (!styleString.includes('display:')) {
            styleString += 'display: block; ';
        }
        
        // Apply width
        if (width) {
            const widthValue = width.includes('px') ? width : `${width}px`;
            if (!styleString.includes('width:')) {
                styleString += `width: ${widthValue}; `;
            }
        } else if (!styleString.includes('width:')) {
            // If no width specified, keep original size or use auto
            styleString += 'width: auto; ';
        }
        
        // Apply height
        if (height) {
            const heightValue = height.includes('px') ? height : `${height}px`;
            if (!styleString.includes('height:')) {
                styleString += `height: ${heightValue}; `;
            }
        } else if (!styleString.includes('height:')) {
            styleString += 'height: auto; ';
        }
        
        // Ensure responsiveness without forcing resize
        if (!styleString.includes('max-width:')) {
            styleString += 'max-width: 100%; ';
        }
        
        img.setAttribute('style', styleString);
        
        // Preserve alt text
        if (!img.getAttribute('alt')) {
            img.setAttribute('alt', 'Image from Word document');
        }
    });
    
    // Process tables - preserve original structure and dimensions
    const tables = doc.querySelectorAll('table');
    tables.forEach((table, tableIndex) => {
        const htmlTable = table as HTMLTableElement;
        
        console.log(`Table ${tableIndex}:`, {
            rows: htmlTable.rows.length,
            cols: htmlTable.rows[0]?.cells.length
        });
        
        // Preserve existing table styling
        const existingStyle = htmlTable.getAttribute('style') || '';
        let tableStyle = existingStyle;
        
        // Add essential table styles without overriding existing ones
        if (!tableStyle.includes('border-collapse')) {
            tableStyle += 'border-collapse: collapse; ';
        }
        
        // Use auto width to preserve original table dimensions, or full width if not specified
        if (!tableStyle.includes('width:')) {
            tableStyle += 'width: auto; ';
        }
        
        if (!tableStyle.includes('margin')) {
            tableStyle += 'margin: 1em 0; ';
        }
        
        htmlTable.setAttribute('style', tableStyle);
        htmlTable.setAttribute('border', '1');
        
        // Process all rows to preserve column widths
        const rows = Array.from(htmlTable.rows);
        rows.forEach((row, rowIndex) => {
            const cells = Array.from(row.cells);
            cells.forEach((cell, cellIndex) => {
                const htmlCell = cell as HTMLElement;
                const existingCellStyle = htmlCell.getAttribute('style') || '';
                let cellStyle = existingCellStyle;
                
                // Add borders if not present
                if (!cellStyle.includes('border')) {
                    cellStyle += 'border: 1px solid #ddd; ';
                }
                
                // Add padding if not present
                if (!cellStyle.includes('padding')) {
                    cellStyle += 'padding: 8px; ';
                }
                
                // Preserve text alignment or default to left
                if (!cellStyle.includes('text-align')) {
                    const align = htmlCell.getAttribute('align') || 'left';
                    cellStyle += `text-align: ${align}; `;
                }
                
                // Preserve background color for header cells
                if (cell.tagName === 'TH' && !cellStyle.includes('background')) {
                    cellStyle += 'background-color: #f2f2f2; font-weight: bold; ';
                }
                
                // Preserve column width if specified
                const width = htmlCell.getAttribute('width');
                if (width && !cellStyle.includes('width')) {
                    const widthValue = width.includes('%') || width.includes('px') ? width : `${width}px`;
                    cellStyle += `width: ${widthValue}; `;
                }
                
                htmlCell.setAttribute('style', cellStyle);
            });
        });
    });
    
    // VALIDATE: Only keep items as list items if they were ACTUALLY numbered in original Word document
    console.log(`\n✅ Validating list items against original Word document...`);
    
    // Build a set of all texts that were ACTUALLY list items in Word
    const validListItemTexts = new Set<string>();
    paragraphData.forEach(data => {
        if (data.isList && data.text) {
            const normalized = data.text.toLowerCase().trim();
            validListItemTexts.add(normalized);
            if (validListItemTexts.size <= 10) {
                console.log(`  ✓ Valid list item from Word: "${data.text.substring(0, 50)}..."`);
            }
        }
    });
    
    console.log(`Total valid list items from Word XML: ${validListItemTexts.size}`);
    
    const allListItems = Array.from(doc.querySelectorAll('li'));
    let invalidItemsRemoved = 0;
    
    console.log(`List items created by mammoth: ${allListItems.length}`);
    
    allListItems.forEach((li, idx) => {
        const htmlLi = li as HTMLElement;
        const text = htmlLi.textContent?.trim() || '';
        const normalizedText = text.toLowerCase().trim();
        
        // Check if this text was actually a list item in Word
        let isValid = false;
        
        // Exact match
        if (validListItemTexts.has(normalizedText)) {
            isValid = true;
        } else {
            // Try partial match for longer texts
            for (const validText of validListItemTexts) {
                if (normalizedText.length >= 15 && validText.length >= 15) {
                    // Match first 20 characters
                    if (normalizedText.substring(0, 20) === validText.substring(0, 20)) {
                        isValid = true;
                        break;
                    }
                }
            }
        }
        
        if (!isValid) {
            // This was NOT a list item in Word - convert to indented paragraph (Word-style)
            if (idx < 20) {
                console.log(`  ❌ NOT in original (${idx}): "${text.substring(0, 60)}..." - converting to indented paragraph`);
            }
            
            const p = document.createElement('p');
            p.innerHTML = htmlLi.innerHTML;
            p.className = 'list-indent'; // Mark as list-indented paragraph
            p.style.marginLeft = '2em'; // Same indent as list items
            p.style.marginBottom = '0.3em';
            p.style.lineHeight = '1.5';
            
            // Copy alignment
            if (htmlLi.style.textAlign) {
                p.style.textAlign = htmlLi.style.textAlign;
            }
            
            // Insert before the list item
            htmlLi.parentNode?.insertBefore(p, htmlLi);
            
            // Remove the list item
            htmlLi.remove();
            invalidItemsRemoved++;
        } else {
            if (idx < 10) {
                console.log(`  ✅ Valid list item (${idx}): "${text.substring(0, 60)}..."`);
            }
        }
    });
    
    console.log(`✅ Removed ${invalidItemsRemoved} items that weren't numbered in original document`);
    
    // Clean up empty lists
    let emptyListsRemoved = 0;
    doc.querySelectorAll('ul, ol').forEach(list => {
        const htmlList = list as HTMLElement;
        const items = htmlList.querySelectorAll('li');
        
        if (items.length === 0) {
            htmlList.remove();
            emptyListsRemoved++;
        }
    });
    
    if (emptyListsRemoved > 0) {
        console.log(`Removed ${emptyListsRemoved} empty lists`);
    }
    
    // Process EXISTING lists from mammoth - FIX THEIR TYPE AND APPLY CORRECT STYLE
    const lists = Array.from(doc.querySelectorAll('ul, ol'));
    console.log(`\n📋 Processing ${lists.length} existing lists from mammoth (after cleanup)`);
    
    let listsFixed = 0;
    let listsWithStyleApplied = 0;
    const processedLists = new Set<HTMLElement>();
    
    lists.forEach((list, listIdx) => {
        const htmlList = list as HTMLElement;
        if (processedLists.has(htmlList)) return; // Skip if already processed
        
        const listItems = htmlList.querySelectorAll(':scope > li');
        
        // Get the first list item's text to match with our data
        if (listItems.length > 0) {
            const firstLi = listItems[0] as HTMLElement;
            const firstText = firstLi.textContent?.trim() || '';
            
            // Find matching list data
            for (const data of paragraphData) {
                if (data.isList && data.text && firstText && (
                    firstText.toLowerCase().includes(data.text.toLowerCase().substring(0, 15)) ||
                    data.text.toLowerCase().includes(firstText.toLowerCase().substring(0, 15))
                )) {
                    // Found a match!
                    const shouldBeNumbered = data.listType === 'number';
                    const isNumbered = htmlList.tagName === 'OL';
                    const desiredStyle = data.listStyle || (shouldBeNumbered ? 'decimal' : 'disc');
                    
                    let finalList = htmlList;
                    
                    // Convert list type if needed
                    if (shouldBeNumbered && !isNumbered) {
                        const ol = document.createElement('ol');
                        ol.innerHTML = htmlList.innerHTML;
                        
                        // Copy all attributes and styles
                        Array.from(htmlList.attributes).forEach(attr => {
                            ol.setAttribute(attr.name, attr.value);
                        });
                        
                        htmlList.parentNode?.replaceChild(ol, htmlList);
                        finalList = ol;
                        console.log(`  🔄 Converted list ${listIdx} UL→OL (${listItems.length} items)`);
                        listsFixed++;
                        processedLists.add(finalList);
                    } else if (!shouldBeNumbered && isNumbered) {
                        const ul = document.createElement('ul');
                        ul.innerHTML = htmlList.innerHTML;
                        
                        // Copy all attributes and styles
                        Array.from(htmlList.attributes).forEach(attr => {
                            ul.setAttribute(attr.name, attr.value);
                        });
                        
                        htmlList.parentNode?.replaceChild(ul, htmlList);
                        finalList = ul;
                        console.log(`  🔄 Converted list ${listIdx} OL→UL (${listItems.length} items)`);
                        listsFixed++;
                        processedLists.add(finalList);
                    } else {
                        processedLists.add(finalList);
                    }
                    
                    // Apply the correct numbering/bullet style
                    if (desiredStyle) {
                        finalList.style.listStyleType = desiredStyle;
                        console.log(`  🎨 Applied style "${desiredStyle}" to ${finalList.tagName} (${listItems.length} items)`);
                        listsWithStyleApplied++;
                    }
                    
                    break;
                }
            }
        }
        
        // Apply styling to the list (whether converted or not)
        const existingStyle = htmlList.getAttribute('style') || '';
        let listStyle = existingStyle;
        
        if (!listStyle.includes('margin')) {
            listStyle += 'margin: 0.5em 0; ';
        }
        if (!listStyle.includes('padding-left')) {
            listStyle += 'padding-left: 2em; ';
        }
        
        htmlList.setAttribute('style', listStyle);
        
        // Style list items
        listItems.forEach(li => {
            const htmlLi = li as HTMLElement;
            const existingLiStyle = htmlLi.getAttribute('style') || '';
            let liStyle = existingLiStyle;
            
            if (!liStyle.includes('margin-bottom')) {
                liStyle += 'margin-bottom: 0.3em; ';
            }
            if (!liStyle.includes('line-height')) {
                liStyle += 'line-height: 1.5; ';
            }
            
            htmlLi.setAttribute('style', liStyle);
        });
    });
    
    console.log(`\n📊 LIST PROCESSING SUMMARY:`);
    console.log(`  • Lists converted (UL↔OL): ${listsFixed}`);
    console.log(`  • Lists with styles applied: ${listsWithStyleApplied}`);
    console.log(`  • Total lists processed: ${lists.length}`);
    
    // FIX CONTINUOUS NUMBERING - Track and continue numbering across list segments
    console.log(`\n🔢 Checking for continuous numbering...`);
    
    const allOrderedLists = Array.from(doc.querySelectorAll('ol'));
    const listsByNumId = new Map<string, HTMLElement[]>();
    
    // Group lists by their numId (from Word)
    allOrderedLists.forEach((list) => {
        const htmlList = list as HTMLElement;
        const firstLi = htmlList.querySelector('li');
        if (!firstLi) return;
        
        const firstText = firstLi.textContent?.trim() || '';
        
        // Find the numId for this list
        for (const data of paragraphData) {
            if (data.isList && data.numId && data.text && firstText && (
                firstText.toLowerCase().includes(data.text.toLowerCase().substring(0, 15)) ||
                data.text.toLowerCase().includes(firstText.toLowerCase().substring(0, 15))
            )) {
                if (!listsByNumId.has(data.numId)) {
                    listsByNumId.set(data.numId, []);
                }
                listsByNumId.get(data.numId)!.push(htmlList);
                break;
            }
        }
    });
    
    console.log(`Found ${listsByNumId.size} unique numbering sequences`);
    
    // For each numbering sequence, set continuous start values
    let totalSegmentsConnected = 0;
    
    listsByNumId.forEach((lists, numId) => {
        if (lists.length > 1) {
            console.log(`  📝 Numbering sequence ${numId} has ${lists.length} segments`);
            
            let cumulativeCount = 0;
            
            lists.forEach((list, idx) => {
                const itemCount = list.querySelectorAll('li').length;
                
                if (idx === 0) {
                    // First list starts at 1
                    cumulativeCount = itemCount;
                    console.log(`    Segment ${idx}: items 1-${itemCount}`);
                } else {
                    // Subsequent lists continue numbering
                    const startNumber = cumulativeCount + 1;
                    list.setAttribute('start', startNumber.toString());
                    console.log(`    Segment ${idx}: starts at ${startNumber}, items ${startNumber}-${startNumber + itemCount - 1}`);
                    cumulativeCount += itemCount;
                    totalSegmentsConnected++;
                }
            });
        }
    });
    
    console.log(`✅ Connected ${totalSegmentsConnected} list segments for continuous numbering`);
    
    // CONVERT paragraphs that should be list items - IMPROVED MATCHING
    console.log('═══════════════════════════════════════');
    console.log('STARTING LIST CONVERSION PROCESS');
    console.log('═══════════════════════════════════════');
    console.log(`Total paragraphs in HTML before conversion: ${doc.querySelectorAll('p').length}`);
    console.log(`List items detected in XML: ${paragraphData.filter(d => d.isList).length}`);
    
    // Create ordered array of list items from paragraphData
    const listItems = paragraphData.filter(d => d.isList);
    console.log('\n📋 LIST ITEMS TO MATCH FROM XML:');
    listItems.forEach((item, i) => {
        console.log(`  ${i}: "${item.text.substring(0, 40)}..." (${item.listType})`);
    });
    
    const allParagraphs = Array.from(doc.querySelectorAll('p'));
    console.log('\n📄 PARAGRAPHS IN HTML:');
    allParagraphs.forEach((p, i) => {
        console.log(`  ${i}: "${p.textContent?.trim().substring(0, 40)}..."`);
    });
    
    // Mark paragraphs that should be list items (don't group yet)
    const markedParagraphs: Array<{para: HTMLElement, data: any, originalIndex: number}> = [];
    
    allParagraphs.forEach((para, paraIndex) => {
        const htmlPara = para as HTMLElement;
        const paraText = htmlPara.textContent?.trim() || '';
        
        if (!paraText) return; // Skip empty paragraphs
        
        // Try to find matching list data
        let matchedData = null;
        let matchedIndex = -1;
        
        // Try matching with each list item
        for (let i = 0; i < listItems.length; i++) {
            const data = listItems[i];
            const dataText = data.text.toLowerCase().trim();
            const htmlText = paraText.toLowerCase().trim();
            
            // Multiple matching strategies
            const matches = 
                // Exact match
                dataText === htmlText ||
                // Contains match (either way)
                (dataText.length > 10 && htmlText.includes(dataText.substring(0, 15))) ||
                (htmlText.length > 10 && dataText.includes(htmlText.substring(0, 15))) ||
                // Fuzzy match - similar start
                (dataText.substring(0, 10) === htmlText.substring(0, 10));
            
            if (matches) {
                matchedData = data;
                matchedIndex = i;
                break;
            }
        }
        
        if (matchedData) {
            console.log(`✅ MATCH FOUND at position ${paraIndex}! List item ${matchedIndex}: "${paraText.substring(0, 40)}..." → ${matchedData.listType}`);
            markedParagraphs.push({
                para: htmlPara,
                data: matchedData,
                originalIndex: paraIndex
            });
        } else {
            // Not a list item - log for debugging
            if (paraText.length > 5) {
                console.log(`❌ NO MATCH at position ${paraIndex}: "${paraText.substring(0, 40)}..."`);
            }
        }
    });
    
    console.log(`\n✅ Total matched list items: ${markedParagraphs.length}`);
    
    // NOW convert each paragraph IN PLACE - don't move them around!
    markedParagraphs.forEach(({para, data}, idx) => {
        // Check if previous and next siblings should also be list items
        const prevSibling = para.previousElementSibling;
        const nextSibling = para.nextElementSibling;
        
        const isPrevList = markedParagraphs.some(m => m.para === prevSibling && m.data.listType === data.listType);
        const isNextList = markedParagraphs.some(m => m.para === nextSibling && m.data.listType === data.listType);
        
        // Only create a list wrapper if this is the FIRST item in a sequence
        if (!isPrevList) {
            // This is the start of a new list - create the ul/ol
            const listElement = document.createElement(data.listType === 'bullet' ? 'ul' : 'ol');
            listElement.style.margin = '0.5em 0';
            listElement.style.paddingLeft = '2em';
            listElement.style.listStyleType = data.listType === 'bullet' ? 'disc' : 'decimal';
            
            // Insert before this paragraph
            para.parentNode?.insertBefore(listElement, para);
            
            // Collect all consecutive list items of the same type
            let currentPara: Element | null = para;
            let itemCount = 0;
            
            while (currentPara && markedParagraphs.some(m => m.para === currentPara && m.data.listType === data.listType)) {
                const htmlCurrentPara = currentPara as HTMLElement;
                const nextPara = currentPara.nextElementSibling;
                
                // Create list item
                const li = document.createElement('li');
                li.innerHTML = htmlCurrentPara.innerHTML;
                li.style.marginBottom = '0.3em';
                li.style.lineHeight = '1.5';
                
                // Copy alignment
                if (htmlCurrentPara.style.textAlign) {
                    li.style.textAlign = htmlCurrentPara.style.textAlign;
                }
                
                listElement.appendChild(li);
                
                // Remove the paragraph
                htmlCurrentPara.parentNode?.removeChild(htmlCurrentPara);
                itemCount++;
                
                currentPara = nextPara;
            }
            
            console.log(`  ✓ Created ${data.listType} list with ${itemCount} items`);
        }
    });
    
    // Re-query lists after conversion
    const updatedLists = doc.querySelectorAll('ul, ol');
    console.log(`\n📊 FINAL RESULT: ${updatedLists.length} total lists in document`);
    console.log('═══════════════════════════════════════\n');
    
    // Apply paragraph alignments and spacing by matching text content
    const paragraphs = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div');
    
    console.log(`Processing ${paragraphs.length} HTML elements for alignment and spacing`);
    
    paragraphs.forEach((para, index) => {
        const htmlPara = para as HTMLElement;
        const existingStyle = htmlPara.getAttribute('style') || '';
        let paraStyle = existingStyle;
        
        // Get the text content of this paragraph
        const paraText = htmlPara.textContent?.trim() || '';
        
        // Try to match with extracted paragraph data by text content
        let appliedAlignment = false;
        for (const data of paragraphData) {
            // Match if the paragraph contains significant portion of the text
            if (paraText && data.text && (
                paraText.includes(data.text.substring(0, 20)) || 
                data.text.includes(paraText.substring(0, 20))
            )) {
                const align = data.alignment;
                let textAlign = 'left';
                
                // Convert Word alignment values to CSS
                switch (align) {
                    case 'center':
                        textAlign = 'center';
                        break;
                    case 'right':
                        textAlign = 'right';
                        break;
                    case 'both':
                    case 'justify':
                        textAlign = 'justify';
                        break;
                    default:
                        textAlign = 'left';
                }
                
                if (textAlign !== 'left' && !paraStyle.includes('text-align')) {
                    paraStyle += `text-align: ${textAlign}; `;
                    console.log(`Applied alignment "${textAlign}" to: "${paraText.substring(0, 40)}..."`);
                }
                
                // Apply spacing if available
                if (data.spacing) {
                    if (data.spacing.before && !paraStyle.includes('margin-top')) {
                        // Convert from twips to em (1 twip = 1/1440 inch, roughly 1/20 pt)
                        const marginTopEm = data.spacing.before / 240; // 240 twips ≈ 1em
                        paraStyle += `margin-top: ${marginTopEm.toFixed(2)}em; `;
                    }
                    if (data.spacing.after && !paraStyle.includes('margin-bottom')) {
                        const marginBottomEm = data.spacing.after / 240;
                        paraStyle += `margin-bottom: ${marginBottomEm.toFixed(2)}em; `;
                    }
                }
                
                // Add default line height for better spacing
                if (!paraStyle.includes('line-height')) {
                    paraStyle += 'line-height: 1.5; ';
                }
                
                appliedAlignment = true;
                break;
            }
        }
        
        // Fallback to index-based if no text match (for backwards compatibility)
        if (!appliedAlignment && paragraphAlignments[index]) {
            const align = paragraphAlignments[index];
            let textAlign = 'left';
            
            switch (align) {
                case 'center':
                    textAlign = 'center';
                    break;
                case 'right':
                    textAlign = 'right';
                    break;
                case 'both':
                case 'justify':
                    textAlign = 'justify';
                    break;
                default:
                    textAlign = 'left';
            }
            
            if (textAlign !== 'left' && !paraStyle.includes('text-align')) {
                paraStyle += `text-align: ${textAlign}; `;
                console.log(`Applied alignment (by index) to paragraph ${index}: ${textAlign}`);
            }
        }
        
        // Check for alignment classes added by mammoth (additional fallback)
        const classList = htmlPara.classList;
        if (!paraStyle.includes('text-align')) {
            if (classList.contains('align-center')) {
                paraStyle += 'text-align: center; ';
            } else if (classList.contains('align-right')) {
                paraStyle += 'text-align: right; ';
            } else if (classList.contains('align-justify')) {
                paraStyle += 'text-align: justify; ';
            }
        }
        
        // Apply default spacing and line height for all paragraphs if not already set
        if (htmlPara.tagName === 'P' && !htmlPara.closest('li')) {
            if (!paraStyle.includes('margin-bottom')) {
                paraStyle += 'margin-bottom: 0.8em; ';
            }
            if (!paraStyle.includes('line-height')) {
                paraStyle += 'line-height: 1.5; ';
            }
        }
        
        // Apply line height to headings
        if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(htmlPara.tagName)) {
            if (!paraStyle.includes('line-height')) {
                paraStyle += 'line-height: 1.3; ';
            }
            if (!paraStyle.includes('margin-top')) {
                paraStyle += 'margin-top: 1em; ';
            }
            if (!paraStyle.includes('margin-bottom')) {
                paraStyle += 'margin-bottom: 0.5em; ';
            }
        }
        
        if (paraStyle !== existingStyle) {
            htmlPara.setAttribute('style', paraStyle);
        }
    });
    
    // Apply font sizes to ALL text elements
    let formattingIndex = 0;
    const allTextElements = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, strong, em, b, i, li, td, th');
    allTextElements.forEach(elem => {
        const htmlElem = elem as HTMLElement;
        
        // Get all text nodes within this element
        const walker = document.createTreeWalker(
            htmlElem,
            NodeFilter.SHOW_TEXT,
            null
        );
        
        let textNode;
        while (textNode = walker.nextNode()) {
            const text = textNode.textContent?.trim();
            if (text && textFormatting[formattingIndex]) {
                // Find matching formatting
                const formatting = textFormatting[formattingIndex];
                
                if (formatting.fontSize) {
                    // Wrap text node in span with font size
                    const span = document.createElement('span');
                    span.style.fontSize = formatting.fontSize;
                    span.textContent = textNode.textContent;
                    
                    textNode.parentNode?.replaceChild(span, textNode);
                    console.log(`Applied font size ${formatting.fontSize} to text at index ${formattingIndex}`);
                }
                
                formattingIndex++;
            }
        }
        
        // Also apply directly to element if it has existing style
        const existingStyle = htmlElem.getAttribute('style') || '';
        if (existingStyle && existingStyle.includes('font-size')) {
            // Parse and ensure it's in a usable format
            const match = existingStyle.match(/font-size:\s*([^;]+)/);
            if (match) {
                const fontSize = match[1].trim();
                // Ensure font size is properly formatted
                if (!fontSize.includes('pt') && !fontSize.includes('px') && !fontSize.includes('em')) {
                    const newStyle = existingStyle.replace(match[0], `font-size: ${fontSize}pt`);
                    htmlElem.setAttribute('style', newStyle);
                }
            }
        }
    });
    
    const finalHtml = doc.body.innerHTML;
    console.log('Post-processing complete. Final HTML length:', finalHtml.length);
    
    return finalHtml;
};

/**
 * Converts HTML content to Word document structure
 */
const htmlToDocxElements = (html: string): (Paragraph | Table)[] => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const elements: (Paragraph | Table)[] = [];
    let bulletCounter = 0;
    let numberCounter = 0;
    
    const processNode = (node: Node): TextRun[] => {
        const runs: TextRun[] = [];
        
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            if (text.trim()) {
                // Default to 11pt (22 half-points) Calibri if no explicit size
                runs.push(new TextRun({ 
                    text,
                    font: 'Calibri',
                    size: 22 // 11pt in half-points
                }));
            }
            return runs;
        }
        
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return runs;
        }
        
        const el = node as HTMLElement;
        
        // Process child nodes
        const childRuns: TextRun[] = [];
        el.childNodes.forEach(child => {
            childRuns.push(...processNode(child));
        });
        
        // Extract font size if present
        const getFontSize = (element: HTMLElement): number | undefined => {
            const fontSize = element.style.fontSize;
            if (fontSize) {
                const match = fontSize.match(/(\d+(\.\d+)?)(pt|px)?/);
                if (match) {
                    let size = parseFloat(match[1]);
                    const unit = match[3] || 'pt'; // Default to pt if no unit
                    
                    // Convert to points if needed (1px = 0.75pt, or 1pt = 1.333px)
                    if (unit === 'px') {
                        size = size * 0.75;
                    }
                    // If already in pt or no unit (assuming pt), use as-is
                    
                    return size * 2; // Word uses half-points (e.g., 12pt = 24 half-points)
                }
            }
            return undefined;
        };
        
        // Apply formatting based on tag
        switch (el.tagName) {
            case 'STRONG':
            case 'B':
                return [new TextRun({ 
                    text: el.textContent || '', 
                    bold: true,
                    size: getFontSize(el) || 22, // Default 11pt
                    font: 'Calibri'
                })];
            case 'EM':
            case 'I':
                return [new TextRun({ 
                    text: el.textContent || '', 
                    italics: true,
                    size: getFontSize(el) || 22, // Default 11pt
                    font: 'Calibri'
                })];
            case 'U':
                return [new TextRun({ 
                    text: el.textContent || '', 
                    underline: {},
                    size: getFontSize(el) || 22, // Default 11pt
                    font: 'Calibri'
                })];
            case 'SUP':
                return [new TextRun({ 
                    text: el.textContent || '', 
                    superScript: true,
                    size: getFontSize(el) || 22, // Default 11pt
                    font: 'Calibri'
                })];
            case 'SUB':
                return [new TextRun({ 
                    text: el.textContent || '', 
                    subScript: true,
                    size: getFontSize(el) || 22, // Default 11pt
                    font: 'Calibri'
                })];
            case 'SPAN':
                const color = el.style.color;
                const fontFamily = el.style.fontFamily ? el.style.fontFamily.split(',')[0].replace(/['"]/g, '').trim() : 'Calibri';
                const runOptions: any = { 
                    text: el.textContent || '',
                    font: fontFamily
                };
                
                if (color) {
                    runOptions.color = rgbToHex(color);
                }
                
                const size = getFontSize(el);
                runOptions.size = size || 22; // Default 11pt
                
                return [new TextRun(runOptions)];
            case 'A':
                const href = (el as HTMLAnchorElement).href;
                const linkText = el.textContent || '';
                if (href && linkText) {
                    return [new ExternalHyperlink({
                        children: [new TextRun({ 
                            text: linkText, 
                            style: 'Hyperlink',
                            size: getFontSize(el) || 22, // Default 11pt
                            font: 'Calibri'
                        })],
                        link: href
                    }) as any];
                }
                return childRuns;
            default:
                return childRuns;
        }
    };
    
    const getAlignment = (el: HTMLElement): AlignmentType | undefined => {
        const align = el.style.textAlign;
        switch (align) {
            case 'left': return AlignmentType.LEFT;
            case 'center': return AlignmentType.CENTER;
            case 'right': return AlignmentType.RIGHT;
            case 'justify': return AlignmentType.JUSTIFIED;
            default: return undefined;
        }
    };
    
    const processElement = (el: Element) => {
        const htmlEl = el as HTMLElement;
        
        switch (htmlEl.tagName) {
            case 'H1':
                const h1Runs = processNode(htmlEl);
                elements.push(new Paragraph({
                    heading: HeadingLevel.HEADING_1,
                    children: h1Runs.length > 0 ? h1Runs : [new TextRun({ text: htmlEl.textContent || '' })],
                    alignment: getAlignment(htmlEl),
                    spacing: {
                        before: 240,
                        after: 120,
                        line: 276
                    }
                }));
                break;
            case 'H2':
                const h2Runs = processNode(htmlEl);
                elements.push(new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: h2Runs.length > 0 ? h2Runs : [new TextRun({ text: htmlEl.textContent || '' })],
                    alignment: getAlignment(htmlEl),
                    spacing: {
                        before: 200,
                        after: 100,
                        line: 276
                    }
                }));
                break;
            case 'H3':
                const h3Runs = processNode(htmlEl);
                elements.push(new Paragraph({
                    heading: HeadingLevel.HEADING_3,
                    children: h3Runs.length > 0 ? h3Runs : [new TextRun({ text: htmlEl.textContent || '' })],
                    alignment: getAlignment(htmlEl),
                    spacing: {
                        before: 180,
                        after: 80,
                        line: 276
                    }
                }));
                break;
            case 'H4':
                const h4Runs = processNode(htmlEl);
                elements.push(new Paragraph({
                    heading: HeadingLevel.HEADING_4,
                    children: h4Runs.length > 0 ? h4Runs : [new TextRun({ text: htmlEl.textContent || '' })],
                    alignment: getAlignment(htmlEl),
                    spacing: {
                        before: 160,
                        after: 80,
                        line: 276
                    }
                }));
                break;
            case 'H5':
                const h5Runs = processNode(htmlEl);
                elements.push(new Paragraph({
                    heading: HeadingLevel.HEADING_5,
                    children: h5Runs.length > 0 ? h5Runs : [new TextRun({ text: htmlEl.textContent || '' })],
                    alignment: getAlignment(htmlEl),
                    spacing: {
                        before: 140,
                        after: 60,
                        line: 276
                    }
                }));
                break;
            case 'H6':
                const h6Runs = processNode(htmlEl);
                elements.push(new Paragraph({
                    heading: HeadingLevel.HEADING_6,
                    children: h6Runs.length > 0 ? h6Runs : [new TextRun({ text: htmlEl.textContent || '' })],
                    alignment: getAlignment(htmlEl),
                    spacing: {
                        before: 120,
                        after: 60,
                        line: 276
                    }
                }));
                break;
            case 'P':
                const runs = processNode(htmlEl);
                if (runs.length > 0 || htmlEl.textContent?.trim()) {
                    // Check if this is an indented paragraph (part of a list context)
                    const isListIndent = htmlEl.classList.contains('list-indent') || 
                                        (htmlEl.style.marginLeft && parseFloat(htmlEl.style.marginLeft) > 0);
                    
                    const paragraphOptions: any = {
                        children: runs.length > 0 ? runs : [new TextRun({ text: htmlEl.textContent || '' })],
                        alignment: getAlignment(htmlEl),
                        spacing: {
                            after: 200,
                            line: 276
                        }
                    };
                    
                    // If indented, add indent property
                    if (isListIndent) {
                        paragraphOptions.indent = {
                            left: convertInchesToTwip(0.5) // Same as list items
                        };
                    }
                    
                    elements.push(new Paragraph(paragraphOptions));
                }
                break;
            case 'UL':
                // Process unordered list items with nesting support
                const processUlItems = (ulElement: HTMLElement, level: number = 0) => {
                    ulElement.querySelectorAll(':scope > li').forEach((li) => {
                        const liEl = li as HTMLElement;
                        
                        // Process direct text/inline content
                        const liRuns: any[] = [];
                        Array.from(liEl.childNodes).forEach(child => {
                            if (child.nodeType === Node.TEXT_NODE) {
                                const text = child.textContent?.trim();
                                if (text) {
                                    liRuns.push(new TextRun({ text }));
                                }
                            } else if (child.nodeName !== 'UL' && child.nodeName !== 'OL') {
                                const childRuns = processNode(child as HTMLElement);
                                liRuns.push(...childRuns);
                            }
                        });
                        
                        if (liRuns.length > 0) {
                            elements.push(new Paragraph({
                                children: liRuns,
                                alignment: getAlignment(liEl),
                                bullet: {
                                    level: Math.min(level, 8) // Max 9 levels (0-8)
                                },
                                spacing: {
                                    after: 100,
                                    line: 276
                                }
                            }));
                        }
                        
                        // Process nested lists
                        const nestedUl = liEl.querySelector(':scope > ul');
                        if (nestedUl) {
                            processUlItems(nestedUl as HTMLElement, level + 1);
                        }
                        
                        const nestedOl = liEl.querySelector(':scope > ol');
                        if (nestedOl) {
                            processOlItems(nestedOl as HTMLElement, level + 1);
                        }
                    });
                };
                processUlItems(htmlEl);
                break;
            case 'OL':
                // Process ordered list items with nesting support
                const processOlItems = (olElement: HTMLElement, level: number = 0) => {
                    olElement.querySelectorAll(':scope > li').forEach((li) => {
                        const liEl = li as HTMLElement;
                        
                        // Process direct text/inline content
                        const liRuns: any[] = [];
                        Array.from(liEl.childNodes).forEach(child => {
                            if (child.nodeType === Node.TEXT_NODE) {
                                const text = child.textContent?.trim();
                                if (text) {
                                    liRuns.push(new TextRun({ text }));
                                }
                            } else if (child.nodeName !== 'UL' && child.nodeName !== 'OL') {
                                const childRuns = processNode(child as HTMLElement);
                                liRuns.push(...childRuns);
                            }
                        });
                        
                        if (liRuns.length > 0) {
                            elements.push(new Paragraph({
                                children: liRuns,
                                alignment: getAlignment(liEl),
                                numbering: {
                                    reference: 'ordered-list',
                                    level: Math.min(level, 8) // Max 9 levels (0-8)
                                },
                                spacing: {
                                    after: 100,
                                    line: 276
                                }
                            }));
                        }
                        
                        // Process nested lists
                        const nestedOl = liEl.querySelector(':scope > ol');
                        if (nestedOl) {
                            processOlItems(nestedOl as HTMLElement, level + 1);
                        }
                        
                        const nestedUl = liEl.querySelector(':scope > ul');
                        if (nestedUl) {
                            processUlItems(nestedUl as HTMLElement, level + 1);
                        }
                    });
                };
                processOlItems(htmlEl);
                break;
            case 'TABLE':
                const tableEl = htmlEl as HTMLTableElement;
                const rows = Array.from(tableEl.rows);
                const tableRows: TableRow[] = rows.map(row => {
                    const cells = Array.from(row.cells).map(cell => 
                        new TableCell({
                            children: [new Paragraph({ 
                                children: [new TextRun({ text: cell.textContent || '' })]
                            })],
                            width: { size: 100 / row.cells.length, type: WidthType.PERCENTAGE }
                        })
                    );
                    return new TableRow({ children: cells });
                });
                
                if (tableRows.length > 0) {
                    elements.push(new Table({
                        rows: tableRows,
                        width: { size: 100, type: WidthType.PERCENTAGE }
                    }));
                }
                break;
            case 'BR':
                elements.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
                break;
            default:
                // For divs and other containers, process children
                if (htmlEl.children.length > 0) {
                    Array.from(htmlEl.children).forEach(child => processElement(child));
                } else if (htmlEl.textContent?.trim()) {
                    // If it's a text node without specific formatting
                    elements.push(new Paragraph({
                        children: processNode(htmlEl)
                    }));
                }
        }
    };
    
    Array.from(tempDiv.children).forEach(child => processElement(child));
    
    // If no elements were created, add at least one paragraph
    if (elements.length === 0) {
        elements.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
    }
    
    return elements;
};

/**
 * Converts RGB/RGBA color to hex format for Word
 */
const rgbToHex = (rgb: string): string => {
    // Handle rgb() or rgba() format
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `${r}${g}${b}`.toUpperCase();
    }
    // Handle hex format
    if (rgb.startsWith('#')) {
        return rgb.substring(1).toUpperCase();
    }
    return '000000'; // Default to black
};

/**
 * Exports HTML content as a Word document (.docx)
 */
export const exportAsDocx = async (htmlContent: string, filename: string, fileHandle?: any) => {
    try {
        const docElements = htmlToDocxElements(htmlContent);
        
        const doc = new Document({
            numbering: {
                config: [
                    {
                        reference: 'ordered-list',
                        levels: [
                            {
                                level: 0,
                                format: 'decimal',
                                text: '%1.',
                                alignment: AlignmentType.LEFT,
                                style: {
                                    paragraph: {
                                        indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
                                    },
                                },
                            },
                            {
                                level: 1,
                                format: 'lowerLetter',
                                text: '%2.',
                                alignment: AlignmentType.LEFT,
                                style: {
                                    paragraph: {
                                        indent: { left: convertInchesToTwip(1.0), hanging: convertInchesToTwip(0.25) },
                                    },
                                },
                            },
                            {
                                level: 2,
                                format: 'lowerRoman',
                                text: '%3.',
                                alignment: AlignmentType.LEFT,
                                style: {
                                    paragraph: {
                                        indent: { left: convertInchesToTwip(1.5), hanging: convertInchesToTwip(0.25) },
                                    },
                                },
                            },
                            {
                                level: 3,
                                format: 'decimal',
                                text: '%4.',
                                alignment: AlignmentType.LEFT,
                                style: {
                                    paragraph: {
                                        indent: { left: convertInchesToTwip(2.0), hanging: convertInchesToTwip(0.25) },
                                    },
                                },
                            },
                            {
                                level: 4,
                                format: 'lowerLetter',
                                text: '%5.',
                                alignment: AlignmentType.LEFT,
                                style: {
                                    paragraph: {
                                        indent: { left: convertInchesToTwip(2.5), hanging: convertInchesToTwip(0.25) },
                                    },
                                },
                            },
                            {
                                level: 5,
                                format: 'lowerRoman',
                                text: '%6.',
                                alignment: AlignmentType.LEFT,
                                style: {
                                    paragraph: {
                                        indent: { left: convertInchesToTwip(3.0), hanging: convertInchesToTwip(0.25) },
                                    },
                                },
                            },
                            {
                                level: 6,
                                format: 'decimal',
                                text: '%7.',
                                alignment: AlignmentType.LEFT,
                                style: {
                                    paragraph: {
                                        indent: { left: convertInchesToTwip(3.5), hanging: convertInchesToTwip(0.25) },
                                    },
                                },
                            },
                            {
                                level: 7,
                                format: 'lowerLetter',
                                text: '%8.',
                                alignment: AlignmentType.LEFT,
                                style: {
                                    paragraph: {
                                        indent: { left: convertInchesToTwip(4.0), hanging: convertInchesToTwip(0.25) },
                                    },
                                },
                            },
                            {
                                level: 8,
                                format: 'lowerRoman',
                                text: '%9.',
                                alignment: AlignmentType.LEFT,
                                style: {
                                    paragraph: {
                                        indent: { left: convertInchesToTwip(4.5), hanging: convertInchesToTwip(0.25) },
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: convertInchesToTwip(1),
                            right: convertInchesToTwip(1),
                            bottom: convertInchesToTwip(1),
                            left: convertInchesToTwip(1),
                        },
                    },
                },
                children: docElements,
            }],
        });
        
        const blob = await Packer.toBlob(doc);
        
        if (fileHandle) {
            // Use provided file handle (already selected by user)
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            console.log('✅ Word document saved to selected location!');
        } else {
            // Fallback to download
            console.log('📥 Downloading Word document to Downloads folder');
            saveAs(blob, filename);
        }
    } catch (error) {
        console.error('Error creating .docx file:', error);
        throw new Error('Failed to create Word document');
    }
};


