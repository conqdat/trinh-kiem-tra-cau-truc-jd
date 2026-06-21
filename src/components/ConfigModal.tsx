import React, { useState } from 'react';
import { AppConfig } from '../types';
import { Settings, Save, X, Eye, EyeOff, RotateCcw } from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSave: (newConfig: AppConfig) => void;
}

export default function ConfigModal({ isOpen, onClose, config, onSave }: ConfigModalProps) {
  const [minMatchScore, setMinMatchScore] = useState(config.minMatchScore);
  const [checkOrder, setCheckOrder] = useState(config.checkOrder);
  const [orderWeight, setOrderWeight] = useState(config.orderWeight);

  const [showSecrets, setShowSecrets] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      minMatchScore,
      checkOrder,
      orderWeight,
    });
    onClose();
  };

  const handleReset = () => {
    setMinMatchScore(80);
    setCheckOrder(true);
    setOrderWeight(20);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-display font-semibold text-slate-800">
              Cấu hình Trình kiểm tra JD
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Matching Rules Configuration */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Quy chuẩn So khớp & Đánh giá
              </h3>
            </div>

            {/* Minimum Match % */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ngưỡng khớp tối thiểu để Hợp lệ: <span className="font-bold text-indigo-600">{minMatchScore}%</span>
              </label>
              <input
                type="range"
                min="30"
                max="100"
                step="5"
                value={minMatchScore}
                onChange={(e) => setMinMatchScore(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Trông đợi sai số (30%)</span>
                <span>Khớp hoàn hảo (100%)</span>
              </div>
            </div>



            {/* Check Order Toggle */}
            <div className="flex flex-col justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-slate-800">Kiểm tra Thứ tự Section</h4>
                  <p className="text-xs text-slate-500 mr-2">Cộng/trừ điểm nếu thứ tự đúng mẫu chuẩn</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkOrder}
                    onChange={(e) => setCheckOrder(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            {/* Order Score Weight */}
            <div className={`transition-all duration-200 ${checkOrder ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Trọng số điểm thứ tự cấu trúc: <span className="font-bold text-indigo-600">{orderWeight}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                disabled={!checkOrder}
                value={orderWeight}
                onChange={(e) => setOrderWeight(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>0% (Không phạt thứ tự)</span>
                <span>50% (Thứ tự đóng góp một nửa điểm)</span>
              </div>
            </div>
          </div>

          {/* Footer controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Đặt lại mặc định
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm hover:shadow-md transition"
              >
                <Save className="w-4 h-4" />
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
