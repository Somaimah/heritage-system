import React from 'react';
import { AlertTriangle, LogOut, ShieldAlert, Trash2, RefreshCw, X } from 'lucide-react';

const ConfirmationModal = ({ isOpen, config, onClose }) => {
  if (!isOpen) return null;

  // Map icons based on action type
  const getIcon = () => {
    switch (config.type) {
      case 'danger': return <Trash2 className="text-red-600" size={24} />;
      case 'security': return <ShieldAlert className="text-[#E09F26]" size={24} />;
      case 'logout': return <LogOut className="text-[#4A0C16]" size={24} />;
      case 'restore': return <RefreshCw className="text-emerald-600" size={24} />;
      default: return <AlertTriangle className="text-[#E09F26]" size={24} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-[#4A0C16]/40 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl border border-[#E09F26]/30 shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
            {getIcon()}
          </div>
          
          <h3 className="text-lg font-black text-[#4A0C16] font-serif mb-2 tracking-tight">
            {config.title}
          </h3>
          
          <p className="text-xs text-gray-500 leading-relaxed mb-8 px-2">
            {config.message}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              className="py-3 px-4 rounded-xl text-xs font-bold text-gray-400 hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
            >
              Abort Action
            </button>
            <button
              onClick={() => {
                config.onConfirm();
                onClose();
              }}
              className={`py-3 px-4 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-95 ${
                config.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#4A0C16] hover:bg-[#31080E]'
              }`}
            >
              {config.confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;