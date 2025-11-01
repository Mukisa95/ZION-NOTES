// Table of Contents utilities

export interface TocItem {
  id: string;
  text: string;
  level: number; // 1 for H1, 2 for H2, etc.
  element?: HTMLElement; // Reference to the actual element
}

// Generate unique ID for a heading
export const generateHeadingId = (text: string, index: number): string => {
  const sanitized = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  return `heading-${sanitized}-${index}`;
};

// Auto-detect headings from HTML content
export const extractHeadingsFromHtml = (editorElement: HTMLElement): TocItem[] => {
  const headings: TocItem[] = [];
  const headingElements = editorElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
  
  headingElements.forEach((heading, index) => {
    const level = parseInt(heading.tagName.substring(1)); // H1 -> 1, H2 -> 2, etc.
    const text = heading.textContent?.trim() || `Heading ${index + 1}`;
    const id = heading.id || generateHeadingId(text, index);
    
    // Set ID if not present
    if (!heading.id) {
      heading.id = id;
    }
    
    headings.push({
      id,
      text,
      level,
      element: heading as HTMLElement
    });
  });
  
  return headings;
};

// Manually mark text as heading and add to TOC
export const markAsHeading = (
  editorElement: HTMLElement,
  level: number = 2
): TocItem | null => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }
  
  const range = selection.getRangeAt(0);
  
  // Check if selection is within editor
  if (!editorElement.contains(range.commonAncestorContainer)) {
    return null;
  }
  
  const selectedText = selection.toString().trim();
  if (!selectedText) return null;
  
  // Create heading element
  const heading = document.createElement(`h${level}`);
  heading.textContent = selectedText;
  heading.style.marginTop = '1em';
  heading.style.marginBottom = '0.5em';
  heading.style.fontWeight = 'bold';
  
  // Apply heading-specific styling
  switch (level) {
    case 1:
      heading.style.fontSize = '2em';
      break;
    case 2:
      heading.style.fontSize = '1.5em';
      break;
    case 3:
      heading.style.fontSize = '1.17em';
      break;
    default:
      heading.style.fontSize = '1em';
  }
  
  // Generate unique ID
  const existingHeadings = editorElement.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
  const id = generateHeadingId(selectedText, existingHeadings);
  heading.id = id;
  
  // Replace selection with heading
  try {
    range.deleteContents();
    range.insertNode(heading);
    
    // Clear selection
    selection.removeAllRanges();
    
    // Trigger input event to update content
    const event = new Event('input', { bubbles: true, cancelable: true });
    editorElement.dispatchEvent(event);
    
    return {
      id,
      text: selectedText,
      level,
      element: heading
    };
  } catch (error) {
    console.error('Failed to mark as heading:', error);
    return null;
  }
};

// Scroll to a heading by ID
export const scrollToHeading = (
  headingId: string,
  scrollContainer?: HTMLElement | null
): void => {
  const heading = document.getElementById(headingId);
  if (!heading) {
    console.warn('Heading not found:', headingId);
    return;
  }
  
  if (scrollContainer) {
    // Scroll within container
    const containerRect = scrollContainer.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    const scrollTop = scrollContainer.scrollTop + headingRect.top - containerRect.top - 100;
    
    scrollContainer.scrollTo({
      top: scrollTop,
      behavior: 'smooth'
    });
  } else {
    // Scroll window
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  
  // Highlight the heading briefly
  const originalBackground = heading.style.backgroundColor;
  heading.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'; // Blue highlight
  heading.style.transition = 'background-color 0.3s';
  
  setTimeout(() => {
    heading.style.backgroundColor = originalBackground;
    setTimeout(() => {
      heading.style.transition = '';
    }, 300);
  }, 1500);
};

// Check if content has any headings
export const hasHeadings = (editorElement: HTMLElement): boolean => {
  return editorElement.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0;
};

