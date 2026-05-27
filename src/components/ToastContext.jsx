import React, { createContext, useContext, useState, useEffect } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  // Automatically hide the alert after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  // Define the styles matching that cute alert look
  const getToastStyles = (type) => {
    switch (type) {
      case "success": // For: Validated, Posted, Uploaded
        return {
          bg: "bg-[#E6F4EA] border-[#CCECD5]",
          text: "text-[#137333]",
          icon: <CheckCircle className="w-5 h-5 text-[#137333]" />,
        };
      case "error": // For: Returned, Failed
        return {
          bg: "bg-red-50 border-red-200",
          text: "text-red-800",
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
        };
      case "info": // For: Uploading states, processing
        return {
          bg: "bg-blue-50 border-blue-200",
          text: "text-blue-800",
          icon: <Info className="w-5 h-5 text-blue-600" />,
        };
      default:
        return {
          bg: "bg-gray-50 border-gray-200",
          text: "text-gray-800",
          icon: <Info className="w-5 h-5 text-gray-600" />,
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* The Alert Bubble Container */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-fadeIn transition-all duration-300">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-lg max-w-md ${getToastStyles(toast.type).bg}`}>
            {getToastStyles(toast.type).icon}
            <p className={`text-sm font-medium font-sans tracking-wide ${getToastStyles(toast.type).text}`}>
              {toast.message}
            </p>
            <button 
              onClick={() => setToast(null)} 
              className="ml-4 p-0.5 rounded-full hover:bg-black/5 transition"
            >
              <X className={`w-4 h-4 opacity-60 ${getToastStyles(toast.type).text}`} />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);