import React from "react";
import { Quote, Loader2 } from "lucide-react";

export const PendingProverbCard = ({ 
  item, 
  feedbackValue, 
  onFeedbackChange, 
  onApprove, 
  onReturn, 
  onViewDetails, 
  isProcessing 
}) => {
  return (
    <div className="bg-white rounded-[32px] flex flex-col shadow-[0_16px_45px_rgba(74,12,22,0.06)] border-2 border-[#E09F26]/20 hover:border-[#E09F26]/60 transition-all duration-300 p-8 justify-between min-h-[340px] group relative overflow-hidden">
      <div>
        {/* Status/Header Row to match shared layout alignment */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <span className="text-[11px] text-[#4A0C16] bg-[#FEF9C3] font-extrabold uppercase tracking-widest px-3 py-1 rounded-lg border border-[#E09F26]/20 truncate max-w-[70%]">
            {item.category || "General Verification"}
          </span>
          <span className="text-[10px] text-amber-800 bg-amber-50 font-black uppercase tracking-widest px-3 py-1 rounded-md border border-amber-100 shrink-0">
            Pending
          </span>
        </div>

        {/* Proverb Text Block - Sized exactly like SharedPublishedProverbs */}
        <div className="flex gap-4 items-start">
          <Quote size={32} className="text-[#E09F26] mt-0.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity duration-300" />
          <h3 className="text-2xl md:text-3xl font-black text-[#4A0C16] italic font-serif line-clamp-4 leading-snug tracking-wide">
            "{item.proverb || item.title}"
          </h3>
        </div>
        
        {item.meaning && (
          <p className="text-base text-gray-500 line-clamp-3 pl-12 mt-4 font-medium leading-relaxed">
            {item.meaning}
          </p>
        )}
      </div>
      
      {/* Action Controller Block */}
      <div className="flex flex-col gap-3 mt-6 pt-4 border-t border-gray-100">
        <div className="flex gap-2 items-center">
          <textarea 
            placeholder="Add moderation remarks here..." 
            value={feedbackValue || ""} 
            onChange={(e) => onFeedbackChange(item.id, e.target.value)} 
            className="border border-[#E09F26]/20 rounded-xl p-3 text-xs focus:outline-none focus:border-[#E09F26] bg-gray-50/50 resize-none flex-1 h-12 leading-tight font-medium" 
          />
          <div className="flex flex-col gap-1 shrink-0 w-24">
            <button 
              disabled={isProcessing}
              onClick={() => onApprove(item, "proverb")} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center disabled:opacity-50 shadow-xs"
            >
              {isProcessing ? <Loader2 size={12} className="animate-spin" /> : 'Validate'}
            </button>
            <button 
              disabled={isProcessing}
              onClick={() => onReturn(item, "proverb")} 
              className="bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center disabled:opacity-50 shadow-xs"
            >
              {isProcessing ? <Loader2 size={12} className="animate-spin" /> : 'Return'}
            </button>
          </div>
        </div>
        
        <button 
          onClick={() => onViewDetails(item.id)} 
          className="w-full bg-[#4A0C16] hover:bg-[#31080E] text-white py-3.5 px-4 rounded-xl text-sm font-bold tracking-wide transition duration-200 shadow-xs"
        >
          View Proverb Details
        </button>
      </div>
    </div>
  );
};