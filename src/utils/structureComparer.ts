import { SectionMatch, ScanResult, FileInfo } from '../types';
import { sanitizeSectionHeading } from './docxParser';

/**
 * Calculates the classic Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Initialize
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Populate matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,    // deletion
          matrix[i][j - 1] + 1,    // insertion
          matrix[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Returns string similarity score from 0.0 to 1.0 (fuzzy match)
 */
export function computeStringSimilarity(a: string, b: string): number {
  const normA = sanitizeSectionHeading(a);
  const normB = sanitizeSectionHeading(b);

  if (!normA && !normB) return 1.0;
  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;

  const dist = levenshteinDistance(normA, normB);
  const maxLength = Math.max(normA.length, normB.length);
  return 1.0 - dist / maxLength;
}

/**
 * Interface for comparison config parameters
 */
export interface CompareConfig {
  checkOrder: boolean;
  orderWeight: number; // e.g. 20 (meaning 20% of score comes from correct order)
  minMatchScore: number; // e.g. 80 (required percentage to mark as valid overall)
}

/**
 * Compares actual headings found in a file against standard template headings
 */
export function compareStructure(
  fileHeadings: string[],
  templateHeadings: string[],
  config: CompareConfig
): {
  score: number;
  matchedSections: SectionMatch[];
  missingSections: string[];
  extraSections: string[];
} {
  const matchedSections: SectionMatch[] = [];
  const minFuzzyThreshold = 0.65; // At least 65% name similarities to be considered the same heading

  // Keep track of which actual file headings are matched to avoid double matching
  const matchedFileIndices = new Set<number>();

  // Map each template heading to the most similar heading in the target file
  templateHeadings.forEach((tempHeading) => {
    let bestMatchIdx = -1;
    let bestScore = 0;

    fileHeadings.forEach((fileHeading, fIdx) => {
      if (matchedFileIndices.has(fIdx)) return;

      const score = computeStringSimilarity(tempHeading, fileHeading);
      if (score > bestScore) {
        bestScore = score;
        bestMatchIdx = fIdx;
      }
    });

    if (bestMatchIdx !== -1 && bestScore >= minFuzzyThreshold) {
      matchedFileIndices.add(bestMatchIdx);
      matchedSections.push({
        templateSection: tempHeading,
        matchedFileSection: fileHeadings[bestMatchIdx],
        score: bestScore,
        isMatched: true,
        orderCorrect: true, // will evaluate next
        actualIndex: bestMatchIdx,
      });
    } else {
      matchedSections.push({
        templateSection: tempHeading,
        score: 0,
        isMatched: false,
        orderCorrect: false,
      });
    }
  });

  // Identify extra/unmapped file sections
  const extraSections: string[] = [];
  fileHeadings.forEach((fileHeading, fIdx) => {
    if (!matchedFileIndices.has(fIdx)) {
      extraSections.push(fileHeading);
    }
  });

  // Calculate order correctness of matched items
  const matchedWithIndices = matchedSections.filter((s) => s.isMatched && s.actualIndex !== undefined);
  
  if (matchedWithIndices.length > 1) {
    for (let i = 0; i < matchedWithIndices.length; i++) {
      const current = matchedWithIndices[i];
      // Check if current's actual index is greater than or equal to the previous item's actual index
      if (i > 0) {
        const previous = matchedWithIndices[i - 1];
        if (current.actualIndex !== undefined && previous.actualIndex !== undefined) {
          if (current.actualIndex < previous.actualIndex) {
            current.orderCorrect = false;
          }
        }
      }
    }
  }

  // Math Scoring Logic:
  // 1. Completion rate: what % of headings match
  const matchedCount = matchedSections.filter((s) => s.isMatched).length;
  const completionPercent = templateHeadings.length > 0 
    ? (matchedCount / templateHeadings.length) * 100 
    : 100;

  // 2. Order Rate: what % of matched items are in correct sequential index order
  let orderPercent = 100;
  if (matchedWithIndices.length > 1) {
    const correctPairs = matchedWithIndices.filter((s) => s.orderCorrect).length;
    // Normalized
    orderPercent = (correctPairs / matchedWithIndices.length) * 100;
  }

  // 3. Weighted Final score
  let finalScore = completionPercent;
  if (config.checkOrder && templateHeadings.length > 0) {
    const weight = config.orderWeight / 100;
    finalScore = completionPercent * (1 - weight) + orderPercent * weight;
  }

  // Clean rounding
  finalScore = Math.min(100, Math.max(0, Math.round(finalScore)));

  const missingSections = matchedSections
    .filter((s) => !s.isMatched)
    .map((s) => s.templateSection);

  return {
    score: finalScore,
    matchedSections,
    missingSections,
    extraSections,
  };
}
