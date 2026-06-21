import { useState, useEffect } from 'react';
import { selectLocalFile, selectLocalFolder } from '../utils/localFileSystem';
import { FileInfo, AppConfig } from '../types';
import { FileText, Folder, ArrowRight, Loader2 } from 'lucide-react';

interface SelectorStepProps {
  config: AppConfig;
  templateFile: FileInfo | null;
  onSelectTemplate: (file: FileInfo | null) => void;
  targetFolder: FileInfo | null;
  onSelectFolder: (folder: FileInfo | null) => void;
  onNext: () => void;
  isLoadingMetadata: boolean;
  setIsLoadingMetadata: (loading: boolean) => void;
}

export default function SelectorStep({
  config,
  templateFile,
  onSelectTemplate,
  targetFolder,
  onSelectFolder,
  isLoggedIn,
  onNext,
  isLoadingMetadata,
  setIsLoadingMetadata,
}: SelectorStepProps) {
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleSelectTemplate = async () => {
    setErrorText(null);
    try {
      const file = await selectLocalFile();
      if (file) {
        onSelectTemplate(file);
      }
    } catch (e: any) {
      setErrorText('Lỗi khi chọn file mẫu: ' + e.message);
    }
  };

  const handleSelectFolder = async () => {
    setErrorText(null);
    try {
      const folder = await selectLocalFolder();
      if (folder) {
        onSelectFolder(folder);
      }
    } catch (e: any) {
      setErrorText('Lỗi khi chọn thư mục: ' + e.message);
    }
  };

  const canProceed = templateFile && targetFolder;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6">
      {/* Intro instruction card */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row gap-5 items-start">
        <div className="w-12 h-12 shrink-0 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg select-none">
          💡
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Hướng dẫn thiết lập liên kết nhanh
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 leading-relaxed">
            Hệ thống sẽ tải tệp JD mẫu dạng `.docx` và duyệt đệ quy (không giới hạn độ sâu) tất cả các tệp `.docx` con nằm trong Thư mục X của bạn để thực hiện kiểm chứng so khớp nhanh.
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2 text-[10px] text-slate-500 font-mono">
            <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md">1. Chọn file mẫu .docx</span>
            <span className="text-slate-300">&rarr;</span>
            <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md">2. Chọn thư mục chứa các JD cần kiểm tra</span>
            <span className="text-slate-300">&rarr;</span>
            <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md">3. Chạy quét & Chấm điểm cấu trúc</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Template Docx */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg">
                  <FileText className="w-5 h-5 text-slate-800" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">File JD Mẫu chuẩn</h3>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 rounded-full">Bắt buộc</span>
            </div>

            <p className="text-slate-500 text-xs leading-relaxed">
              Dùng để phân tích và lập danh sách các Headings/Mục đề bắt buộc chính thức của một bản JD chuẩn của bạn.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSelectTemplate}
                className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-dashed border-slate-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
              >
                <FileText className="w-4 h-4 text-indigo-500" />
                Duyệt file .docx từ Máy tính
              </button>
            </div>
          </div>

          {templateFile ? (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-2">
              <span className="text-sm">✅</span>
              <div className="text-xs min-w-0">
                <span className="block font-semibold text-emerald-900 truncate">
                  {templateFile.name}
                </span>
                <span className="block text-emerald-600 font-mono mt-0.5 text-[10px] truncate">
                  Path: {templateFile.path}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-400 italic">
              Chưa liên kết tệp tiêu chuẩn.
            </div>
          )}
        </div>

        {/* Card 2: Root Directory Folder */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg">
                  <Folder className="w-5 h-5 text-slate-800" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Thư mục Gốc X</h3>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 rounded-full">Bắt buộc</span>
            </div>

            <p className="text-slate-500 text-xs leading-relaxed">
              Mã ID thư mục tổng thể chứa các JD nhánh con để chạy cơ chế quét đệ quy và đánh giá.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSelectFolder}
                className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-dashed border-slate-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
              >
                <Folder className="w-4 h-4 text-indigo-500" />
                Duyệt thư mục gốc từ Máy tính
              </button>
            </div>
          </div>

          {targetFolder ? (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-2">
              <span className="text-sm">✅</span>
              <div className="text-xs min-w-0">
                <span className="block font-semibold text-emerald-900 truncate">
                  {targetFolder.name}
                </span>
                <span className="block text-emerald-600 font-mono mt-0.5 text-[10px] truncate">
                  Path: {targetFolder.path}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-400 italic">
              Chưa liên kết thư mục cần quét.
            </div>
          )}
        </div>
      </div>

      {errorText && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-800 leading-relaxed font-semibold">
          {errorText}
        </div>
      )}

      {/* Progress placeholder loading */}
      {isLoadingMetadata && (
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-indigo-600 bg-indigo-50/50 p-4 rounded-lg border border-indigo-100/50">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang nạp và định danh thông tin tệp chuẩn từ Google Drive...</span>
        </div>
      )}

      <div className="pt-4 flex justify-end">
        <button
          onClick={onNext}
          disabled={!canProceed || isLoadingMetadata}
          className="flex items-center gap-1.5 px-6 py-2.5 font-bold text-xs uppercase tracking-wide text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg shadow-sm transition"
        >
          Tiếp tục bước xác cấu trúc
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
