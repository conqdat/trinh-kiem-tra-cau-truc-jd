export interface FileInfo {
  id: string; // Internal unique ID or path
  name: string;
  path: string; // e.g. "Folder/Subfolder/file.docx"
  file?: File; // For individual file selection
  handle?: any; // FileSystemFileHandle or FileSystemDirectoryHandle
}

export interface SectionMatch {
  templateSection: string;
  matchedFileSection?: string;
  score: number; // Similarity between 0 and 1
  isMatched: boolean;
  orderCorrect: boolean;
  actualIndex?: number;
}

export interface ScanResult {
  file: FileInfo;
  status: 'pending' | 'processing' | 'comparing' | 'copying' | 'valid' | 'invalid' | 'failed';
  score: number; // Overall similarity percentage (0 - 100)
  errorMessage?: string;
  sectionsCount: number;
  matchedSections: SectionMatch[];
  missingSections: string[];
  extraSections: string[];
  originalFileUrl?: string; // Could be local path string
  exportedFileName?: string;
}

export interface AppConfig {
  minMatchScore: number; // default: 80
  checkOrder: boolean; // whether sections order strictly matters
  orderWeight: number; // default: 20% weight if order matters
}

export interface FolderNode {
  id: string;
  name: string;
  parentId?: string;
  children: FolderNode[];
  filesFound: number;
}
