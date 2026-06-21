import { useState, useEffect } from 'react';
import { FileInfo, ScanResult, AppConfig } from './types';
import Navbar from './components/Navbar';
import ConfigModal from './components/ConfigModal';
import SelectorStep from './components/SelectorStep';
import TemplatePreview from './components/TemplatePreview';
import ScanningProgress from './components/ScanningProgress';
import ResultsTable from './components/ResultsTable';
import { HelpCircle, FileText, CheckSquare, BarChart, Settings, FolderClosed, BookOpen } from 'lucide-react';

type StepType = 'select_target' | 'preview_template' | 'scanning' | 'results';

export default function App() {
  const [step, setStep] = useState<StepType>('select_target');
  const [config, setConfig] = useState<AppConfig>({ minMatchScore: 80, checkOrder: true, orderWeight: 20 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // States for target linkage
  const [templateFile, setTemplateFile] = useState<FileInfo | null>(null);
  const [targetFolder, setTargetFolder] = useState<FileInfo | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  // States for analysis reference
  const [templateHeadings, setTemplateHeadings] = useState<string[]>([]);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [ignoredCount, setIgnoredCount] = useState(0);

  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
  };

  const handleResetApp = () => {
    setStep('select_target');
    setTemplateFile(null);
    setTargetFolder(null);
    setScanResults([]);
    setIgnoredCount(0);
    setTemplateHeadings([]);
  };

  const handleHeadingsPrepared = (headings: string[]) => {
    setTemplateHeadings(headings);
    setStep('scanning');
  };

  const handleScanFinished = (results: ScanResult[], ignoredList: any[]) => {
    setScanResults(results);
    setIgnoredCount(ignoredList.length);
    setStep('results');
  };

  return (
    <div id="jd_checker_main_app" className="min-h-screen bg-slate-50 flex flex-col">
      {/* Dynamic Navbar Top */}
      <Navbar
        config={config}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Horizontal Navigation Step Indicator */}
        {step !== 'results' && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="flex items-center justify-between border border-slate-200 bg-white px-6 py-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-7 w-full justify-between">
                
                {/* Stage 1 */}
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition ${
                    step === 'select_target'
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/10'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    1
                  </div>
                  <div className="hidden sm:block">
                    <span className="block text-xs font-bold text-slate-800 leading-none">Liên kết Local</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Chọn file mẫu & thư mục cần quét trên máy</span>
                  </div>
                </div>

                <div className="flex-1 h-px bg-slate-200 mx-2 hidden sm:block"></div>

                {/* Stage 2 */}
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition ${
                    step === 'preview_template'
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/10'
                      : step === 'scanning' || step === 'results'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    2
                  </div>
                  <div className="hidden sm:block">
                    <span className="block text-xs font-bold text-slate-800 leading-none">Duyệt Cấu Trúc Mẫu</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Xem trước & chỉnh sửa tiêu chuẩn</span>
                  </div>
                </div>

                <div className="flex-1 h-px bg-slate-200 mx-2 hidden sm:block"></div>

                {/* Stage 3 */}
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition ${
                    step === 'scanning'
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/10'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    3
                  </div>
                  <div className="hidden sm:block">
                    <span className="block text-xs font-bold text-slate-800 leading-none">Phân tích đệ quy</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Đọc đệ quy & chấm điểm</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Route View rendering */}
        {step === 'select_target' && (
          <SelectorStep
            config={config}
            templateFile={templateFile}
            onSelectTemplate={setTemplateFile}
            targetFolder={targetFolder}
            onSelectFolder={setTargetFolder}
            onNext={() => setStep('preview_template')}
            isLoadingMetadata={isLoadingMetadata}
            setIsLoadingMetadata={setIsLoadingMetadata}
          />
        )}

        {step === 'preview_template' && templateFile && (
          <TemplatePreview
            templateFile={templateFile}
            onHeadingsPrepared={handleHeadingsPrepared}
            onPrev={() => setStep('select_target')}
          />
        )}

        {step === 'scanning' && targetFolder && (
          <ScanningProgress
            config={config}
            targetFolder={targetFolder}
            templateHeadings={templateHeadings}
            onScanFinished={handleScanFinished}
            onCancel={handleResetApp}
          />
        )}

        {step === 'results' && (
          <div className="space-y-6">
            {/* Header section in dashboard */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xxs">
              <div>
                <h1 className="text-2xl font-display font-black text-slate-800">
                  Bảng Kết Quả Đối Lập Cấu Trúc JD
                </h1>
                <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                  Quá trình duyệt đệ quy từ thư mục <span className="font-semibold text-slate-700">"{targetFolder?.name}"</span> hoàn tất.
                  Đối sánh so khớp với tệp chuẩn <span className="font-semibold text-slate-705">"{templateFile?.name}"</span> thành công.
                </p>
              </div>
              <button
                onClick={handleResetApp}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs text-white rounded-xl shadow-sm hover:shadow-md transition shrink-0"
              >
                Chạy kiểm chứng mới
              </button>
            </div>

            <ResultsTable
              results={scanResults}
              ignoredCount={ignoredCount}
              onReset={handleResetApp}
            />
          </div>
        )}


      </main>

      {/* Floating System configuration Modal */}
      <ConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={handleSaveConfig}
      />

      {/* Sticky Dark Footer matching Design HTML */}
      <footer className="h-10 bg-slate-900 text-slate-400 px-6 flex items-center justify-between text-[10px] uppercase tracking-wider shrink-0 select-none">
        <div className="flex gap-4">
          <span>Version 1.0.4-stable</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Local File System API
          </span>
        </div>
        <div className="hidden sm:block">
          Hệ thống vận hành 100% tại Client (Browser-only)
        </div>
      </footer>
    </div>
  );
}
