import { useState, useEffect } from 'react';
import { readFileAsArrayBuffer } from '../utils/localFileSystem';
import { extractHeadingsFromDocx } from '../utils/docxParser';
import { FileInfo } from '../types';
import { Play, Plus, Trash2, ArrowUp, ArrowDown, Edit3, Check, Loader2, Sparkles, FileText } from 'lucide-react';

interface TemplatePreviewProps {
  templateFile: FileInfo;
  onHeadingsPrepared: (headings: string[]) => void;
  onPrev: () => void;
}

export default function TemplatePreview({
  templateFile,
  onHeadingsPrepared,
  onPrev,
}: TemplatePreviewProps) {
  const [headings, setHeadings] = useState<string[]>([]);
  const [htmlPreview, setHtmlPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  // For adding custom heading
  const [newHeadingText, setNewHeadingText] = useState('');
  
  // For editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // Active sub-tab (Edit Standard sections vs Raw HTML Preview)
  const [activeTab, setActiveTab] = useState<'editor' | 'html'>('editor');

  useEffect(() => {
    async function loadTemplate() {
      setLoading(true);
      setErrorText(null);
      try {
        const buffer = await readFileAsArrayBuffer(templateFile);
        const { headings: parsedHeadings, rawHtml } = await extractHeadingsFromDocx(buffer);
        setHeadings(parsedHeadings);
        setHtmlPreview(rawHtml);
      } catch (err: any) {
        console.error(err);
        setErrorText(
          `Không thể đọc tệp JD mẫu: ${err.message}. Đảm bảo tệp mẫu của bạn ở định dạng .docx hợp lệ và quyền hạn được cho phép.`
        );
      } finally {
        setLoading(false);
      }
    }
    loadTemplate();
  }, [templateFile]);

  const handleAddHeading = () => {
    if (!newHeadingText.trim()) return;
    setHeadings([...headings, newHeadingText.trim()]);
    setNewHeadingText('');
  };

  const handleDeleteHeading = (index: number) => {
    const updated = headings.filter((_, idx) => idx !== index);
    setHeadings(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...headings];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setHeadings(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === headings.length - 1) return;
    const updated = [...headings];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setHeadings(updated);
  };

  const startEditing = (idx: number, text: string) => {
    setEditingIndex(idx);
    setEditingText(text);
  };

  const saveEditing = () => {
    if (editingIndex === null || !editingText.trim()) return;
    const updated = [...headings];
    updated[editingIndex] = editingText.trim();
    setHeadings(updated);
    setEditingIndex(null);
  };

  const handleProceed = () => {
    if (headings.length === 0) {
      setErrorText('Danh sách tiêu chuẩn hiện đang trống. Hãy thiết lập ít nhất 1 đề mục bắt buộc để tiến hành chấm cấu trúc.');
      return;
    }
    onHeadingsPrepared(headings);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Xem trước & Tinh chỉnh mẫu chuẩn
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Ứng dụng đã giải mã tệp tin <span className="font-semibold text-slate-800">{templateFile.name}</span>. Kiểm tra & chuẩn hóa lại các đề mục bắt buộc của bạn.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center space-y-4 shadow-sm">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <div className="text-center">
            <p className="font-semibold text-slate-700 text-sm">Đang tải và trích xuất tệp .docx chuẩn...</p>
            <p className="text-xs text-slate-400 mt-1">Mammoth.js phân tích hoàn toàn trong trình duyệt.</p>
          </div>
        </div>
      ) : errorText ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl space-y-4 shadow-sm">
          <p className="text-sm text-rose-800 leading-relaxed font-semibold">{errorText}</p>
          <button
            onClick={onPrev}
            className="px-4 py-2 text-xs font-semibold bg-white border border-rose-250 text-rose-700 rounded-lg hover:bg-rose-100/50 transition"
          >
            Quay lại chọn tệp khác
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Workspace Column */}
          <div className="lg:col-span-12 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Tab selector */}
            <div className="flex justify-between items-center border-b border-slate-200 px-6 bg-slate-50">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`py-4 text-xs font-bold border-b-2 uppercase tracking-wide cursor-pointer px-1 ${
                    activeTab === 'editor'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  ✏️ Bản Biên Tập Section ({headings.length})
                </button>
                <button
                  onClick={() => setActiveTab('html')}
                  className={`py-4 text-xs font-bold border-b-2 uppercase tracking-wide cursor-pointer px-1 ${
                    activeTab === 'html'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  📄 Văn Bản Gốc HTML
                </button>
              </div>

              <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-[10px] font-bold">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Trích xuất gốc tự động</span>
              </div>
            </div>

            {/* TAB CONTENTS */}
            <div className="p-6">
              {activeTab === 'editor' ? (
                <div className="space-y-6">
                  {/* Explanatory callout */}
                  <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                    💡 <strong>Mẹo:</strong> Thứ tự và cấu trúc này sẽ được làm đối sánh trực tiếp. Bạn có thể xóa bớt các section không liên quan (như "Tháng", "Số điện thoại") hoặc tùy biến lại tên định sác chuẩn để tăng độ chính xác !
                  </p>

                  {/* Add item bar */}
                  <div className="flex gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      value={newHeadingText}
                      onChange={(e) => setNewHeadingText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddHeading()}
                      placeholder="Thêm đề mục bắt buộc mới (ví dụ: Yêu cầu Công việc)..."
                      className="flex-1 bg-white px-3 py-2 border border-slate-200 text-xs rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-550/10 focus:border-indigo-550 text-slate-700 font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleAddHeading}
                      className="px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-md flex items-center gap-1 transition"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm
                    </button>
                  </div>

                  {/* Headings list editor */}
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-96 overflow-y-auto">
                    {headings.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-xs italic">
                        Không trích xuất được đề mục nào. Hãy tự thêm thủ công đề mục bên trên!
                      </div>
                    ) : (
                      headings.map((heading, index) => (
                        <div
                          key={`${heading}-${index}`}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50/50 transition"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                            <span className="w-6 h-6 text-[10px] text-slate-500 font-mono bg-slate-100 border border-slate-200 rounded flex items-center justify-center shrink-0">
                              {index + 1}
                            </span>
                            {editingIndex === index ? (
                              <div className="flex gap-1.5 flex-1 items-center">
                                <input
                                  type="text"
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none font-semibold text-slate-800"
                                />
                                <button
                                  onClick={saveEditing}
                                  className="p-1.5 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-slate-850 truncate">
                                {heading}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Up / Down Controls */}
                            <button
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-25 rounded-md"
                              title="Di chuyển lên"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveDown(index)}
                              disabled={index === headings.length - 1}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-25 rounded-md"
                              title="Di chuyển xuống"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Control */}
                            {editingIndex !== index && (
                              <button
                                onClick={() => startEditing(index, heading)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
                                title="Sửa tên mục"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete Control */}
                            <button
                              onClick={() => handleDeleteHeading(index)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                              title="Xóa đề mục"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400 pb-2 border-b border-slate-250">
                    <FileText className="w-4 h-4 text-slate-700" />
                    <span>Nội dung đã dịch từ tập tin .docx thành định dạng HTML thô</span>
                  </div>
                  {/* HTML Box */}
                  <div
                    className="p-4 bg-slate-50 border border-slate-200 rounded-lg max-h-96 overflow-y-auto text-xs text-slate-600 font-mono italic leading-relaxed prose prose-slate"
                    dangerouslySetInnerHTML={{ __html: htmlPreview }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation and execution */}
      <div className="pt-4 flex justify-between items-center border-t border-slate-200">
        <button
          onClick={onPrev}
          className="px-5 py-2.5 text-xs font-semibold text-slate-605 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition"
        >
          Quay lại đổi tệp
        </button>

        <button
          onClick={handleProceed}
          disabled={loading || headings.length === 0}
          className="flex items-center gap-1.5 px-6 py-2.5 font-bold text-xs uppercase tracking-wide text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-lg shadow-sm transition"
        >
          <Play className="w-3.5 h-3.5 shrink-0 fill-current" />
          Tiến hành quét Thư mục
        </button>
      </div>
    </div>
  );
}
