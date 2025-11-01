// Compression utilities for large documents

// Calculate size of content in bytes
export const getContentSize = (content: string): number => {
  return new Blob([content]).size;
};

// Format bytes to human-readable size
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Remove all images from HTML content
export const removeAllImages = (html: string): string => {
  return html.replace(/<img[^>]*>/g, '<p style="color: gray; font-style: italic;">[Image removed]</p>');
};

// Count images in content
export const countImages = (html: string): number => {
  const matches = html.match(/<img[^>]*>/g);
  return matches ? matches.length : 0;
};

// GZIP-like compression using browser's CompressionStream (if available)
export const compressWithGzip = async (content: string): Promise<string> => {
  try {
    // Check if CompressionStream is available (modern browsers)
    if (typeof CompressionStream !== 'undefined') {
      const blob = new Blob([content]);
      const stream = blob.stream();
      const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
      const compressedBlob = await new Response(compressedStream).blob();
      const arrayBuffer = await compressedBlob.arrayBuffer();
      
      // Convert to base64 for storage
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      return `GZIP:${base64}`;
    } else {
      // Fallback: simple text compression using LZ-based algorithm
      return compressLZString(content);
    }
  } catch (error) {
    console.error('GZIP compression failed:', error);
    return content;
  }
};

// Decompress GZIP content
export const decompressGzip = async (compressed: string): Promise<string> => {
  try {
    if (compressed.startsWith('GZIP:')) {
      const base64 = compressed.substring(5);
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      if (typeof DecompressionStream !== 'undefined') {
        const blob = new Blob([bytes]);
        const stream = blob.stream();
        const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
        const decompressedBlob = await new Response(decompressedStream).blob();
        return await decompressedBlob.text();
      }
    } else if (compressed.startsWith('LZ:')) {
      return decompressLZString(compressed);
    }
    return compressed;
  } catch (error) {
    console.error('GZIP decompression failed:', error);
    return compressed;
  }
};

// Simple LZ-based compression fallback
const compressLZString = (str: string): string => {
  const dict: { [key: string]: number } = {};
  const data = (str + "").split("");
  const out: number[] = [];
  let currChar;
  let phrase = data[0];
  let code = 256;
  
  for (let i = 1; i < data.length; i++) {
    currChar = data[i];
    if (dict[phrase + currChar] != null) {
      phrase += currChar;
    } else {
      out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
      dict[phrase + currChar] = code;
      code++;
      phrase = currChar;
    }
  }
  out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
  
  return 'LZ:' + out.join(',');
};

// Simple LZ-based decompression
const decompressLZString = (compressed: string): string => {
  if (!compressed.startsWith('LZ:')) return compressed;
  
  const data = compressed.substring(3).split(',').map(Number);
  const dict: { [key: number]: string } = {};
  let currChar = String.fromCharCode(data[0]);
  let oldPhrase = currChar;
  const out = [currChar];
  let code = 256;
  let phrase;
  
  for (let i = 1; i < data.length; i++) {
    const currCode = data[i];
    if (currCode < 256) {
      phrase = String.fromCharCode(currCode);
    } else {
      phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
    }
    out.push(phrase);
    currChar = phrase.charAt(0);
    dict[code] = oldPhrase + currChar;
    code++;
    oldPhrase = phrase;
  }
  
  return out.join('');
};

// Reduce image quality by re-encoding
export const reduceImageQuality = async (html: string, quality: number = 0.7): Promise<string> => {
  const imgRegex = /<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"([^>]*)>/g;
  let result = html;
  const matches = [...html.matchAll(imgRegex)];
  
  for (const match of matches) {
    const [fullMatch, format, base64Data, attributes] = match;
    
    try {
      // Create image element
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = `data:image/${format};base64,${base64Data}`;
      });
      
      // Calculate new dimensions (max 1200px width)
      let width = img.width;
      let height = img.height;
      const maxWidth = 1200;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      // Create canvas and draw reduced quality image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert back to base64 with reduced quality
      const newFormat = format === 'png' ? 'image/png' : 'image/jpeg';
      const compressedBase64 = canvas.toDataURL(newFormat, quality).split(',')[1];
      
      // Replace in HTML
      const newImg = `<img src="data:${newFormat};base64,${compressedBase64}"${attributes}>`;
      result = result.replace(fullMatch, newImg);
    } catch (error) {
      console.error('Failed to compress image:', error);
      // Keep original if compression fails
    }
  }
  
  return result;
};

// Get detailed size breakdown
export interface SizeBreakdown {
  total: number;
  text: number;
  images: number;
  imageCount: number;
  largestImage: number;
}

export const getSizeBreakdown = (html: string): SizeBreakdown => {
  const imgRegex = /<img[^>]+src="data:image\/[^;]+;base64,([^"]+)"[^>]*>/g;
  let textContent = html;
  let imagesSize = 0;
  let imageCount = 0;
  let largestImage = 0;
  
  const matches = [...html.matchAll(imgRegex)];
  for (const match of matches) {
    const base64Data = match[1];
    const imageSize = Math.ceil((base64Data.length * 3) / 4); // Approximate decoded size
    imagesSize += imageSize;
    imageCount++;
    if (imageSize > largestImage) {
      largestImage = imageSize;
    }
    textContent = textContent.replace(match[0], '');
  }
  
  const textSize = new Blob([textContent]).size;
  
  return {
    total: new Blob([html]).size,
    text: textSize,
    images: imagesSize,
    imageCount,
    largestImage
  };
};

export enum CompressionMethod {
  NONE = 'none',
  REMOVE_IMAGES = 'remove_images',
  REDUCE_QUALITY = 'reduce_quality',
  GZIP = 'gzip',
  GZIP_AND_REDUCE = 'gzip_and_reduce',
  REMOVE_IMAGES_AND_GZIP = 'remove_images_and_gzip',
  SPLIT_DOCUMENT = 'split_document'
}

// Split document into parts based on size
export interface SplitResult {
  part1: string;
  part2: string;
  splitPoint: string; // Description of where split occurred
}

export const splitDocument = (html: string, maxSize: number): SplitResult => {
  // Try to split at a good point (paragraph boundary, heading, etc.)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;
  
  let currentSize = 0;
  let splitIndex = -1;
  let splitPoint = '';
  const children = Array.from(body.children);
  
  // Find the split point by accumulating size
  for (let i = 0; i < children.length; i++) {
    const element = children[i];
    const elementHtml = element.outerHTML;
    const elementSize = new Blob([elementHtml]).size;
    
    if (currentSize + elementSize > maxSize * 0.85) { // Split at 85% to be safe
      splitIndex = i;
      
      // Describe the split point
      const tagName = element.tagName.toLowerCase();
      const text = element.textContent?.substring(0, 50) || '';
      splitPoint = `${tagName.toUpperCase()}: "${text}${text.length >= 50 ? '...' : ''}"`;
      break;
    }
    
    currentSize += elementSize;
  }
  
  if (splitIndex === -1 || splitIndex === 0) {
    // Can't split cleanly, split at approximate middle
    const middleIndex = Math.floor(children.length / 2);
    splitIndex = middleIndex > 0 ? middleIndex : 1;
    splitPoint = `Middle of document (element ${splitIndex}/${children.length})`;
  }
  
  // Create the two parts
  const part1Children = children.slice(0, splitIndex);
  const part2Children = children.slice(splitIndex);
  
  const part1Doc = document.implementation.createHTMLDocument();
  const part2Doc = document.implementation.createHTMLDocument();
  
  part1Children.forEach(child => part1Doc.body.appendChild(child.cloneNode(true)));
  part2Children.forEach(child => part2Doc.body.appendChild(child.cloneNode(true)));
  
  return {
    part1: part1Doc.body.innerHTML,
    part2: part2Doc.body.innerHTML,
    splitPoint
  };
};

// Apply selected compression method
export const applyCompression = async (
  content: string,
  method: CompressionMethod,
  quality: number = 0.7
): Promise<string> => {
  switch (method) {
    case CompressionMethod.REMOVE_IMAGES:
      return removeAllImages(content);
      
    case CompressionMethod.REDUCE_QUALITY:
      return await reduceImageQuality(content, quality);
      
    case CompressionMethod.GZIP:
      return await compressWithGzip(content);
      
    case CompressionMethod.GZIP_AND_REDUCE:
      // Step 1: Reduce image quality
      const reduced = await reduceImageQuality(content, quality);
      // Step 2: GZIP compress everything
      return await compressWithGzip(reduced);
      
    case CompressionMethod.REMOVE_IMAGES_AND_GZIP:
      // Step 1: Remove all images
      const noImages = removeAllImages(content);
      // Step 2: GZIP compress the text
      return await compressWithGzip(noImages);
      
    case CompressionMethod.SPLIT_DOCUMENT:
      // For split, we'll handle this differently in the dialog
      return content;
      
    case CompressionMethod.NONE:
    default:
      return content;
  }
};

