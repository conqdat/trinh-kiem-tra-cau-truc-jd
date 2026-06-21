import { useState } from 'react';

import { AppConfig } from '../types';
import { LogIn, LogOut, Settings, Info, ShieldAlert, CheckCircle } from 'lucide-react';

interface NavbarProps {
  config: AppConfig;
  onOpenSettings: () => void;
}

export default function Navbar({
  config,
  onOpenSettings,
}: NavbarProps) {



  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo Brand matching Design HTML */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">JD Validator Pro</h1>
              <p className="text-[10px] sm:text-xs text-slate-500">Phân tích cấu trúc Job Description tự động</p>
            </div>
          </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full select-none">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] sm:text-xs font-medium text-emerald-700 uppercase tracking-wider">Local Mode</span>
              </div>
            
              {/* Config Button */}
              <button
                onClick={onOpenSettings}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-50 border border-slate-200 cursor-pointer transition shadow-xxs"
                title="Cấu hình so khớp"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
    </nav>
  );
}
