export const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.head.appendChild(script);
  });
};

interface MammothResult {
  value: string; // HTML string
  messages: any[];
}

// Global typing reference
declare global {
  interface Window {
    mammoth: {
      convertToHtml: (
        input: { arrayBuffer: ArrayBuffer },
        options?: any
      ) => Promise<MammothResult>;
      extractRawText: (
        input: { arrayBuffer: ArrayBuffer }
      ) => Promise<{ value: string; messages: any[] }>;
    };
  }
}

/**
 * Ensures mammoth.js is loaded from Cloudflare CDN
 */
export async function ensureMammothLoaded(): Promise<void> {
  if (window.mammoth) return;
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js');
}

/**
 * Strips common bullet numbering (e.g. "1.", "I.", "a.", "-", "●") and trims spaces
 */
export function sanitizeSectionHeading(heading: string): string {
  return heading
    .replace(/^([0-9a-zA-Z\d]+[\.\-\)\s]+|[\-\*●•◦◘○▫◽▪]\s*)+/g, '') // remove "1.", "a.", "I.", "●"
    .replace(/[:：\s]+$/g, '') // remove trailing colons or excess space
    .trim()
    .toLowerCase();
}

/**
 * Main parsing function: Converts docx ArrayBuffer to text headings/sections
 */
export async function extractHeadingsFromDocx(arrayBuffer: ArrayBuffer): Promise<{
  headings: string[]; // List of original headings
  sanitizedHeadings: string[]; // Sanitized lower-case headings for comparison
  rawHtml: string;
}> {
  await ensureMammothLoaded();

  const result = await window.mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const headings: string[] = [];

  // Traverse children in DOM order
  const elements = doc.body.querySelectorAll('*');
  elements.forEach((el) => {
    const text = (el.textContent || '').trim();
    if (!text || text.length < 3 || text.length > 150) return;

    const tagName = el.tagName.toLowerCase();
    
    // Pattern 1: standard heading tags (H1 - H6)
    const isStandardHeading = /^h[1-6]$/.test(tagName);

    // Pattern 2: Paragraph with strong tag inside only (e.g., <p><strong>Heading</strong></p>)
    let isBoldParagraph = false;
    if (tagName === 'p') {
      const childNodes = Array.from(el.childNodes);
      const isStrongParent = childNodes.every(
        (node) =>
          node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === '' ||
          (node.nodeType === Node.ELEMENT_NODE &&
            (node.nodeName.toLowerCase() === 'strong' || node.nodeName.toLowerCase() === 'b'))
      );
      if (isStrongParent && el.querySelector('strong, b')) {
        isBoldParagraph = true;
      }
    }

    // Pattern 3: Fully capitalized text paragraph (usually uppercase headers)
    const isUppercase = text.length > 5 && text === text.toUpperCase() && !text.includes('HTTP') && !text.includes('@');

    if (isStandardHeading || isBoldParagraph || isUppercase) {
      // Avoid duplicate sibling paragraphs parsed twice (e.g., we query both parent and sub-strong)
      // Check if this heading text is already added in sequence
      const normalizedCurrent = text.toLowerCase();
      const lastHeading = headings[headings.length - 1];
      if (!lastHeading || lastHeading.toLowerCase() !== normalizedCurrent) {
        headings.push(text);
      }
    }
  });

  const sanitizedHeadings = headings.map(sanitizeSectionHeading).filter(Boolean);

  return {
    headings,
    sanitizedHeadings,
    rawHtml: html,
  };
}
