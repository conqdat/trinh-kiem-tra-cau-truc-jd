import React, { useState, useEffect, useRef } from 'react';
import { scanFolderRecursive, readFileAsArrayBuffer } from '../utils/localFileSystem';
import { extractHeadingsFromDocx } from '../utils/docxParser';
import { compareStructure } from '../utils/structureComparer';
import { FileInfo, ScanResult, AppConfig, FolderNode } from '../types';
import { Loader2, Play, Pause, AlertTriangle, CheckCircle2, XCircle, Info, Archive, FolderTree } from 'lucide-react';

interface ScanningProgressProps {
  config: AppConfig;
  targetFolder: FileInfo;
  templateHeadings: string[];
  onScanFinished: (results: ScanResult[], ignoredFiles: any[]) => void;
  onCancel: () => void;
}

export default function ScanningProgress({
  config,
  targetFolder,
  templateHeadings,
  onScanFinished,
  onCancel,
}: ScanningProgressProps) {
  const [stage, setStage] = useState<'scan_folders' | 'process_files' | 'complete'>('scan_folders');
  const [currentFolderScanned, setCurrentFolderScanned] = useState('');
  const [scannedFilesCount, setScannedFilesCount] = useState(0);
  
  // Scanned lists
  const [docxTargets, setDocxTargets] = useState<FileInfo[]>([]);
  const [ignoredFiles, setIgnoredFiles] = useState<{ name: string; folderPath: string; mimeType: string }[]>([]);
  const [folderTree, setFolderTree] = useState<FolderNode | null>(null);

  // Active processes
  const [results, setResults] = useState<ScanResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Stats
  const [processedCount, setProcessedCount] = useState(0);
  const [validCount, setValidCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  // Keep references to prevent outdated states in callbacks
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Keep a reference to prevent starting multiple process chains
  const processStartedRef = useRef(false);

  // Step 1: Scan folders
  useEffect(() => {
    async function runDirectoryScan() {
      try {
        const docxFiles = await scanFolderRecursive(targetFolder.handle, targetFolder.name);
        setDocxTargets(docxFiles);
        setIgnoredFiles([]); // Bỏ qua vì local file system ta chỉ lọc .docx
        setFolderTree(null);

        // Pre-initialize results list
        const initialResults: ScanResult[] = docxFiles.map((file) => ({
          file,
          status: 'pending',
          score: 0,
          sectionsCount: 0,
          matchedSections: [],
          missingSections: [],
          extraSections: [],
          originalFileUrl: file.path, // Use local path
        }));
        setResults(initialResults);
        setStage('process_files');
      } catch (err: any) {
        console.error(err);
        alert(`Lỗi quét cây thư mục: ${err.message}. Quay lại bước trước.`);
        onCancel();
      }
    }
    if (targetFolder && targetFolder.handle) {
      runDirectoryScan();
    } else {
      onCancel();
    }
  }, [targetFolder, onCancel]);

  // Step 2: Processing Queue
  useEffect(() => {
    if (stage !== 'process_files' || docxTargets.length === 0 || processStartedRef.current) return;
    
    processStartedRef.current = true;
    
    async function startProcessingQueue() {
      const concurrency = 3; // run up to 3 concurrently to remain highly safe against Google rate limiters
      let index = 0;
      const promises: Promise<void>[] = [];

      // Worker function
      const worker = async () => {
        while (index < docxTargets.length) {
          if (isPausedRef.current) {
            // Wait 500ms before checking again
            await new Promise((r) => setTimeout(r, 500));
            continue;
          }

          const fileIdx = index++;
          if (fileIdx >= docxTargets.length) break;

          setCurrentIndex(fileIdx);
          await processSingleFile(fileIdx);
        }
      };

      // Launch workers
      for (let w = 0; w < Math.min(concurrency, docxTargets.length); w++) {
        promises.push(worker());
      }

      await Promise.all(promises);
      setStage('complete');
    }

    startProcessingQueue();
  }, [stage, docxTargets]);

  // Handle Scan Finished triggering parent update
  useEffect(() => {
    if (stage === 'complete') {
      onScanFinished(results, ignoredFiles);
    }
  }, [stage, results, ignoredFiles, onScanFinished]);

  const processSingleFile = async (idx: number) => {
    const file = docxTargets[idx];
    
    const updateResultStatus = (status: ScanResult['status'], updates: Partial<ScanResult> = {}) => {
      setResults((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], status, ...updates };
        return next;
      });
    };

    try {
      // 1. Read file buffer
      updateResultStatus('processing');
      const buffer = await readFileAsArrayBuffer(file);

      // 2. Parse & Compare
      updateResultStatus('comparing');
      const { headings: fileHeadings } = await extractHeadingsFromDocx(buffer);
      
      const compareResult = compareStructure(fileHeadings, templateHeadings, {
        checkOrder: config.checkOrder,
        orderWeight: config.orderWeight,
        minMatchScore: config.minMatchScore,
      });

      const isValid = compareResult.score >= config.minMatchScore;
      const statusSuffix = isValid ? '_valid' : '_invalid';
      
      // Determine target file name
      const nameParts = file.name.split('.');
      const extension = nameParts.pop() || 'docx';
      const baseName = nameParts.join('.');
      const targetName = `${baseName}${statusSuffix}.${extension}`;

      // 3. We skip copying here for Local FS! 
      // The copy operation will happen in the ResultsTable when user clicks "Lưu kết quả"
      
      // Finish results
      const finalStatus = isValid ? 'valid' : 'invalid';
      updateResultStatus(finalStatus, {
        score: compareResult.score,
        sectionsCount: fileHeadings.length,
        matchedSections: compareResult.matchedSections,
        missingSections: compareResult.missingSections,
        extraSections: compareResult.extraSections,
        exportedFileName: targetName,
      });

      // Stats updating
      setProcessedCount((c) => c + 1);
      if (isValid) {
        setValidCount((c) => c + 1);
      } else {
        setInvalidCount((c) => c + 1);
      }

    } catch (err: any) {
      console.error(err);
      updateResultStatus('failed', {
        errorMessage: err.message || 'Lỗi xử lý file.',
      });
      setProcessedCount((c) => c + 1);
      setFailedCount((c) => c + 1);
    }
  };

  // Helper render of FolderTree structure in real-time logs
  const renderTreeFolderListLogs = (node: FolderNode, depth = 0): React.ReactNode => {
    return (
      <div key={node.id} style={{ paddingLeft: `${depth * 14}px` }} className="text-xs">
        <div className="flex items-center gap-1.5 py-1 text-slate-650 font-mono">
          <span>📁</span>
          <span className="font-semibold text-slate-700">{node.name}</span>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded-sm font-sans font-bold">
            {node.filesFound} file JD (.docx)
          </span>
        </div>
        {node.children.map((child) => renderTreeFolderListLogs(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6">
      {/* 2 types of layouts based on state */}
      {stage === 'scan_folders' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-8 flex flex-col items-center justify-center space-y-6">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          
          <div className="text-center space-y-2">
            <h3 className="text-lg font-display font-bold text-slate-800">
              Đang phân tích đệ quy hệ thống thư mục Google Drive...
            </h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Ứng dụng đang khám phá cấu trúc cây thư mục con tại Thư mục gốc <span className="font-semibold text-slate-700">{targetFolder.name}</span> để lọc tất cả các tệp `.docx` hợp lệ.
            </p>
          </div>

          <div className="w-full max-w-md bg-slate-50 border border-slate-150 p-4 rounded-xl flex items-center justify-between text-xs text-slate-500">
            <div className="text-center w-full">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Đang quét đệ quy...</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Progress panel */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Giai đoạn 2/2: Đánh giá phân tích tệp
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  Đang xử lý phân tích cấu trúc...
                </h2>
              </div>

              {/* Pause/Resume buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border uppercase tracking-wider transition ${
                    isPaused
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {isPaused ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Tiếp tục chạy
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      Tạm Dừng quét
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition"
                >
                  Dừng khẩn cấp
                </button>
              </div>
            </div>

            {/* Micro stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiến Trình</span>
                <span className="block font-bold text-slate-800 text-lg">
                  {processedCount} / {docxTargets.length}
                </span>
              </div>
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1">
                <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Hợp Lệ (Valid)</span>
                <span className="block font-bold text-emerald-800 text-lg">
                  {validCount}
                </span>
              </div>
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1">
                <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider">Không Hợp Lệ</span>
                <span className="block font-bold text-amber-800 text-lg">
                  {invalidCount}
                </span>
              </div>
              <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-lg space-y-1">
                <span className="block text-[10px] font-bold text-rose-500 uppercase tracking-wider">Gặp lỗi</span>
                <span className="block font-bold text-rose-800 text-lg">
                  {failedCount}
                </span>
              </div>
            </div>

            {/* Total Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Số lượng tệp được phân tích</span>
                <span className="font-bold text-slate-800">
                  {Math.round((processedCount / docxTargets.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 border border-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-slate-900 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(processedCount / docxTargets.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Active operating item log */}
            {docxTargets[currentIndex] && (
              <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-lg flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                <div className="text-xs">
                  <span className="block font-bold text-slate-855">
                    Đang xử lý: {docxTargets[currentIndex].name}
                  </span>
                  <span className="block text-slate-500 font-mono mt-0.5 text-[10px]">
                    Đường dẫn: {docxTargets[currentIndex].path || 'Gốc X'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Folder structures layout exploration logs */}
            {folderTree && (
              <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <FolderTree className="w-4 h-4 text-slate-600" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Cây thư mục đã quét
                  </h3>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1">
                  {renderTreeFolderListLogs(folderTree)}
                </div>
              </div>
            )}

            {/* Non-docx ignored files list report */}
            <div className={`${folderTree ? 'lg:col-span-8' : 'lg:col-span-12'} bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4`}>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-slate-500" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Tệp không đúng định dạng bị bỏ qua
                  </h3>
                </div>
                <span className="text-[10px] px-2.5 py-1 font-bold bg-slate-100 border border-slate-200 text-slate-600 rounded-md">
                  Gồm {ignoredFiles.length} tệp
                </span>
              </div>

              {ignoredFiles.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs italic">
                  Không bỏ qua tệp nào. Folder của bạn rất đồng bộ!
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {ignoredFiles.map((f, index) => (
                    <div key={index} className="flex items-center justify-between py-2 text-xs">
                      <span className="text-slate-700 font-semibold truncate max-w-[280px]">
                        {f.name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-slate-400 text-right">
                        <span>Path: {f.folderPath || 'X'}</span>
                        <span className="bg-slate-100 border border-slate-250 px-1.5 py-0.5 rounded text-[9px]">MIME: {f.mimeType.split('/').pop()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
