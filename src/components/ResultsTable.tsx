import { useState, useMemo } from 'react';
import { ScanResult, SectionMatch } from '../types';
import { Search, Filter, Download, ArrowUpDown, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle, FileSpreadsheet, ExternalLink, RefreshCw, Eye, AlertTriangle, Save, Loader2 } from 'lucide-react';
import { selectLocalFolder, copyFileToFolder } from '../utils/localFileSystem';

interface ResultsTableProps {
  results: ScanResult[];
  ignoredCount: number;
  onReset: () => void;
}

export default function ResultsTable({ results, ignoredCount, onReset }: ResultsTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'invalid' | 'failed'>('all');
  const [folderFilter, setFolderFilter] = useState('all');
  
  // Sorting states
  const [sortField, setSortField] = useState<'name' | 'path' | 'score'>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Expanded details row mapping
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Extract unique folder paths for filtering dropdown
  const folderOptions = useMemo(() => {
    const folders = new Set<string>();
    results.forEach((r) => {
      if (r.file.parentName) {
        folders.add(r.file.parentName);
      }
    });
    return Array.from(folders);
  }, [results]);

  // Handle Sort triggers
  const toggleSort = (field: 'name' | 'path' | 'score') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // default to descending
    }
  };

  // Filter & Sort Logic combined
  const processedResults = useMemo(() => {
    let filtered = results.filter((res) => {
      const matchSearch =
        res.file.name.toLowerCase().includes(search.toLowerCase()) ||
        res.file.path.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'valid' && res.status === 'valid') ||
        (statusFilter === 'invalid' && res.status === 'invalid') ||
        (statusFilter === 'failed' && res.status === 'failed');

      const matchFolder =
        folderFilter === 'all' || res.file.parentName === folderFilter;

      return matchSearch && matchStatus && matchFolder;
    });

    // Sorting block
    filtered.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'name') {
        valA = a.file.name.toLowerCase();
        valB = b.file.name.toLowerCase();
      } else if (sortField === 'path') {
        valA = a.file.path.toLowerCase();
        valB = b.file.path.toLowerCase();
      } else if (sortField === 'score') {
        valA = a.score;
        valB = b.score;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [results, search, statusFilter, folderFilter, sortField, sortDirection]);

  // Overall Stats summary
  const summaryStats = useMemo(() => {
    const total = results.length;
    const valid = results.filter((r) => r.status === 'valid').length;
    const invalid = results.filter((r) => r.status === 'invalid').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const avgScore = total > 0 
      ? Math.round(results.reduce((acc, curr) => acc + curr.score, 0) / total) 
      : 0;

    return { total, valid, invalid, failed, avgScore };
  }, [results]);

  // CSV Exporter
  const exportToCSV = () => {
    const headers = [
      'Tên Tệp Gốc',
      'Thư Mục Con',
      'Đường Dẫn Đầy Đủ',
      'Điểm Khớp Cấu Trúc (%)',
      'Trạng Thái',
      'Mục Thiếu',
      'Mục Thừa',
      'Tên Bản Sao Ghi Nhãn',
      'Đường Dẫn Bản Sao',
      'Liên Kết Ban Đầu Drive',
    ];

    const rows = results.map((r) => [
      `"${r.file.name.replace(/"/g, '""')}"`,
      `"${(r.file.parentName || 'Gốc').replace(/"/g, '""')}"`,
      `"${(r.file.path || 'X').replace(/"/g, '""')}"`,
      r.score,
      r.status === 'valid' ? 'Hợp lệ' : r.status === 'failed' ? 'Lỗi hệ thống' : 'Không hợp lệ',
      `"${r.missingSections.join(', ').replace(/"/g, '""')}"`,
      `"${r.extraSections.join(', ').replace(/"/g, '""')}"`,
      `"${(r.copiedFileName || '').replace(/"/g, '""')}"`,
      `"${(r.copiedFileUrl || '').replace(/"/g, '""')}"`,
      `"${r.originalFileUrl || ''}"`,
    ]);

    const csvContent =
      '\ufeff' + // Add UTF-8 BOM so Excel opens Vietnamese characters correctly
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ket_Qua_JD_Checker_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFiles = async () => {
    try {
      const destDirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      if (!destDirHandle) return;

      setIsSaving(true);
      setSaveMessage(null);
      setSaveProgress(0);

      const filesToExport = results.filter(r => r.status === 'valid' || r.status === 'invalid');
      
      let successCount = 0;
      for (let i = 0; i < filesToExport.length; i++) {
        const result = filesToExport[i];
        try {
          const tag = result.status === 'valid' ? '_valid' : '_invalid';
          await copyFileToFolder(result.file, destDirHandle, tag);
          successCount++;
        } catch (e) {
          console.error('Lỗi khi xuất file:', result.file.name, e);
        }
        setSaveProgress(Math.round(((i + 1) / filesToExport.length) * 100));
      }
      
      setSaveMessage(`Đã xuất thành công ${successCount}/${filesToExport.length} file.`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        setSaveMessage('Lỗi lưu file: ' + err.message);
      }
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6">
      {/* Overview stats dashboard cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng tệp .docx</span>
          <span className="block font-bold text-slate-800 text-2xl sm:text-3xl mt-1">
            {summaryStats.total}
          </span>
        </div>
        <div className="bg-emerald-50/50 text-emerald-950 rounded-xl border border-emerald-150 p-4 shadow-sm">
          <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Hợp Lệ (Valid)</span>
          <span className="block font-bold text-emerald-800 text-2xl sm:text-3xl mt-1">
            {summaryStats.valid}
          </span>
        </div>
        <div className="bg-amber-50/50 text-amber-950 rounded-xl border border-amber-150 p-4 shadow-sm">
          <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider font-bold">Chưa Đạt Chuẩn</span>
          <span className="block font-bold text-amber-800 text-2xl sm:text-3xl mt-1">
            {summaryStats.invalid}
          </span>
        </div>
        <div className="bg-rose-50/50 text-rose-955 rounded-xl border border-rose-150 p-4 shadow-sm">
          <span className="block text-[10px] font-bold text-rose-600 uppercase tracking-wider">Quét hỏng</span>
          <span className="block font-bold text-rose-800 text-2xl sm:text-3xl mt-1">
            {summaryStats.failed}
          </span>
        </div>
        <div className="bg-indigo-50/50 text-indigo-955 rounded-xl border border-indigo-150 p-4 shadow-sm col-span-2 md:col-span-1">
          <span className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Độ khớp trung bình</span>
          <span className="block font-bold text-indigo-800 text-2xl sm:text-3xl mt-1">
            {summaryStats.avgScore}%
          </span>
        </div>
      </div>
      
      {saveMessage && (
        <div className="bg-indigo-50 border-y border-indigo-100 py-3 px-4 text-xs text-indigo-800 font-medium flex items-center justify-between rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-500" />
            <span>{saveMessage}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters Panel bar */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên tệp hoặc đường dẫn..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-700 font-medium"
              />
            </div>

            {/* Status filtering */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-lg overflow-x-auto w-full sm:w-auto max-w-full">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider whitespace-nowrap cursor-pointer transition ${
                  statusFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setStatusFilter('valid')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider whitespace-nowrap cursor-pointer transition ${
                  statusFilter === 'valid' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Hợp lệ
              </button>
              <button
                onClick={() => setStatusFilter('invalid')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider whitespace-nowrap cursor-pointer transition ${
                  statusFilter === 'invalid' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Lỗi cấu trúc
              </button>
              <button
                onClick={() => setStatusFilter('failed')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider whitespace-nowrap cursor-pointer transition ${
                  statusFilter === 'failed' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Duyệt hỏng
              </button>
            </div>

            {/* Folder filtering dropdown */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                className="w-full sm:w-auto px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="all">Mọi thư mục con</option>
                {folderOptions.map((fName) => (
                  <option key={fName} value={fName}>
                    📁 {fName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 w-full lg:w-auto border-t lg:border-t-0 pt-3 lg:pt-0">
            <button
              onClick={handleExportFiles}
              disabled={results.length === 0 || isSaving}
              className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:text-slate-100 rounded-lg shadow-sm transition shrink-0"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 shrink-0" />}
              {isSaving ? `Đang lưu (${saveProgress}%)` : 'Lưu File Kết Quả'}
            </button>
            <button
              onClick={exportToCSV}
              disabled={results.length === 0}
              className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg shadow-sm transition shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              Xuất tệp CSV
            </button>
            
            <button
              onClick={onReset}
              className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              Chạy Quét Mới
            </button>
          </div>
        </div>

        {/* DATA TABLE GRAPHIC */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                <th className="py-4 px-6 font-bold cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-1.5">
                    Tên FILE GỐC
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-4 px-6 font-bold cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort('path')}>
                  <div className="flex items-center gap-1.5">
                    THƯ MỤC CHỨA
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-4 px-6 font-bold text-center cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort('score')}>
                  <div className="flex items-center justify-center gap-1.5">
                    ĐỘ KHỚP
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-4 px-6 font-bold text-center">TRẠNG THÁI</th>
                <th className="py-4 px-6 font-bold text-center">SAO CHÉP & ĐÁNH DẤU</th>
                <th className="py-4 px-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {processedResults.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 italic">
                    {results.length === 0 ? 'Chưa quét dữ liệu.' : 'Không có tệp nào khớp với điều kiện lọc.'}
                  </td>
                </tr>
              ) : (
                processedResults.map((row) => {
                  const isExpanded = expandedRowId === row.file.id;
                  return (
                    <>
                      {/* Main static row info */}
                      <tr
                        key={row.file.id}
                        onClick={() => toggleRowExpansion(row.file.id)}
                        className={`hover:bg-slate-50/70 select-none cursor-pointer transition ${
                          isExpanded ? 'bg-slate-50/40 font-medium' : ''
                        }`}
                      >
                        {/* Filename with size */}
                        <td className="py-4 px-6 max-w-xs md:max-w-sm truncate whitespace-nowrap">
                          <span className="block font-bold text-slate-800 truncate" title={row.file.name}>
                            {row.file.name}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                            Kích thước: {row.file.size ? `${Math.round(row.file.size / 1024)} KB` : 'N/A'}
                          </span>
                        </td>

                        {/* Relative path */}
                        <td className="py-4 px-6 font-mono text-slate-500 whitespace-nowrap">
                          <span className="block truncate max-w-[200px]" title={row.file.path}>
                            {row.file.path.replace(row.file.parentName, '').replace(/^\/|\/$/g, '') || '/'}
                            <span className="font-bold text-slate-700 font-sans block text-[10px] mt-0.5">
                              📁 {row.file.parentName || 'Gốc X'}
                            </span>
                          </span>
                        </td>

                        {/* Match score bar */}
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          {row.status === 'failed' ? (
                            <span className="text-slate-400 font-semibold italic text-xxs">Thất bại</span>
                          ) : (
                            <div className="inline-flex flex-col items-center">
                              <span className="font-display font-black text-indigo-600 text-sm">
                                {row.score}%
                              </span>
                              <div className="w-12 bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    row.score >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${row.score}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Validity status badge */}
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          {row.status === 'valid' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold uppercase tracking-wider text-[10px] border border-emerald-100">
                              <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                              HỢP LỆ
                            </span>
                          ) : row.status === 'failed' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full font-bold uppercase tracking-wider text-[10px] border border-rose-100">
                              <AlertCircle className="w-3 h-3 text-rose-500" />
                              LỖI ĐỌC
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-bold uppercase tracking-wider text-[10px] border border-amber-100">
                              <XCircle className="w-3 h-3 text-amber-500 shrink-0" />
                              CHƯA CHUẨN
                            </span>
                          )}
                        </td>

                        {/* File export status */}
                        <td className="py-4 px-6 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-1 items-center justify-center">
                            {row.exportedFileName ? (
                              <span className="text-xxs font-mono text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded border border-emerald-150 transition">
                                Đã lưu: {row.exportedFileName}
                              </span>
                            ) : row.status === 'failed' ? (
                              <span className="text-xxs font-medium text-slate-400 italic">Bị lỗi, bỏ qua</span>
                            ) : (
                              <span className="text-xxs font-medium text-slate-400 italic" title={`Sẽ lưu thành: ${row.file.name.replace('.docx', row.status === 'valid' ? '_valid.docx' : '_invalid.docx')}`}>
                                Chờ lưu
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Expand toggle graphic */}
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </td>
                      </tr>

                      {/* Expanded side-by-side details block */}
                      {isExpanded && (
                        <tr key={`${row.file.id}-expanded`} className="bg-slate-50/50">
                          <td colSpan={6} className="py-6 px-8 border-y border-slate-200">
                            <div className="space-y-6">
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                <div className="space-y-1">
                                  <h4 className="font-display font-black text-slate-800 text-sm">
                                    Báo cáo cấu trúc đối kiểm chi tiết
                                  </h4>
                                  <p className="text-slate-500 text-xs">
                                    Kiểm chứng và ánh xạ các tiêu chí heading so với tệp tham chiếu chuẩn.
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
                                  <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-sm border border-emerald-100">
                                    Đọc được {row.sectionsCount} headings gốc
                                  </span>
                                  {row.missingSections.length > 0 && (
                                    <span className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-sm border border-rose-100">
                                      Thiếu {row.missingSections.length} headings tiêu chuẩn
                                    </span>
                                  )}
                                  {row.extraSections.length > 0 && (
                                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-sm">
                                      Phát hiện thêm {row.extraSections.length} phần bổ sung
                                    </span>
                                  )}
                                </div>
                              </div>

                              {row.status === 'failed' ? (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold block">Không thể phân tích dữ liệu tệp</span>
                                    <p className="mt-1 leading-relaxed">{row.errorMessage || 'Tệp bị mã hóa, bị hỏng hoặc bạn không có đủ quyền sao lưu/đọc trực tiếp.'}</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                                  {/* LHS: Standard layout side match check */}
                                  <div className="bg-white p-4.5 rounded-xl border border-slate-200 space-y-3">
                                    <h5 className="font-semibold text-slate-800 text-xs flex items-center gap-1 border-b border-slate-100 pb-2.5">
                                      🎯 Biểu đồ ánh xạ headings chuẩn
                                    </h5>
                                    
                                    <div className="space-y-2">
                                      {row.matchedSections.map((sec, sIdx) => (
                                        <div
                                          key={sIdx}
                                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                                            sec.isMatched
                                              ? 'bg-emerald-50/20 border-emerald-100'
                                              : 'bg-rose-50/20 border-rose-100'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                              sec.isMatched 
                                                ? 'bg-emerald-100 text-emerald-800' 
                                                : "bg-rose-100 text-rose-800"
                                            }`}>
                                              {sIdx + 1}
                                            </span>
                                            <div className="min-w-0">
                                              <span className={`block font-bold truncate ${
                                                sec.isMatched ? 'text-slate-700' : 'text-rose-950 line-through decoration-rose-300'
                                              }`}>
                                                {sec.templateSection}
                                              </span>
                                              {sec.isMatched && sec.matchedFileSection && sec.score < 1 && (
                                                <span className="block text-[10px] text-slate-400 italic mt-0.5 underline decoration-dotted">
                                                  Khớp mờ với: "{sec.matchedFileSection}"
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          <div className="shrink-0 text-right">
                                            {sec.isMatched ? (
                                              <div className="space-y-1">
                                                <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-800 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase shrink-0">
                                                  {Math.round(sec.score * 100)}% khớp
                                                </span>
                                                {!sec.orderCorrect && (
                                                  <span className="block inline-flex items-center gap-0.5 bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5 text-[9px] font-black uppercase shrink-0">
                                                    Sai thứ tự
                                                  </span>
                                                )}
                                              </div>
                                            ) : (
                                              <span className="inline-flex items-center gap-0.5 bg-rose-100 text-rose-800 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase shrink-0">
                                                Thiếu
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* RHS: Unexpected Extra Section analysis output */}
                                  <div className="bg-white p-4.5 rounded-xl border border-slate-200.5 flex flex-col justify-between">
                                    <div className="space-y-3">
                                      <h5 className="font-semibold text-slate-800 text-xs flex items-center gap-1 border-b border-slate-100 pb-2.5">
                                        ⚡ Các mục phát sinh thêm trong tệp
                                      </h5>
                                      
                                      {row.extraSections.length === 0 ? (
                                        <p className="text-slate-400 text-xs italic p-4 text-center">
                                          Không có mục đề thừa nào. Tệp tuân thủ chuẩn tuyệt đối!
                                        </p>
                                      ) : (
                                        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 text-xs">
                                          {row.extraSections.map((es, idx) => (
                                            <span
                                              key={idx}
                                              className="px-2 py-1 bg-slate-50 border border-slate-150 rounded text-slate-600"
                                            >
                                              {es}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Action links */}
                                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                                      <span className="text-slate-400">Chỉ số so khớp chính thức</span>
                                      <span className="text-xxs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                                        ID: {row.file.id}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
