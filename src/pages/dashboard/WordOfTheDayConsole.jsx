import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Sparkles, X } from "lucide-react";
import { useToast } from "../../components/ToastContext";
import okirPattern from "../../assets/okir-pattern.png";

const WordOfTheDayConsole = ({ onClose, requestConfirm, existingData }) => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 1. Initialize state with existingData if it exists, otherwise blank
  const [wordData, setWordData] = useState({ 
    term: existingData?.term || "", 
    translation: existingData?.translation || "", 
    meaning: existingData?.meaning || "" 
  });

  // 2. The actual save function
  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, "wordOfDay", "today"), {
        ...wordData,
        updatedAt: serverTimestamp()
      });
      showToast(existingData ? "Word updated!" : "Word published!", "success");
      if (onClose) onClose();
    } catch (err) {
      showToast(`Error: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Trigger the confirmation before saving
  const handleSubmit = (e) => {
    e.preventDefault();
    requestConfirm(handleSave, !!existingData); // This triggers your Dashboard's modal
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-lg mb-8 border border-[#E09F26]/30 animate-fadeIn relative">
      <h2 className="text-lg font-bold text-[#4A0C16] font-serif mb-4">
        {existingData ? "Edit Word of the Day" : "Create Word of the Day"}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            placeholder="Term" 
            value={wordData.term} 
            onChange={(e) => setWordData({ ...wordData, term: e.target.value })} 
            className="w-full px-5 py-3.5 rounded-2xl border border-[#E09F26]/30 bg-gray-50 text-sm font-medium text-[#4A0C16] outline-none" 
            required 
          />
          <input 
            placeholder="Translation" 
            value={wordData.translation} 
            onChange={(e) => setWordData({ ...wordData, translation: e.target.value })} 
            className="w-full px-5 py-3.5 rounded-2xl border border-[#E09F26]/30 bg-gray-50 text-sm font-medium text-[#4A0C16] outline-none" 
            required 
          />
        </div>
        <textarea 
          placeholder="Meaning" 
          value={wordData.meaning} 
          onChange={(e) => setWordData({ ...wordData, meaning: e.target.value })} 
          className="w-full px-5 py-3.5 rounded-2xl border border-[#E09F26]/30 bg-gray-50 text-sm font-medium text-[#4A0C16] outline-none" 
          rows={3} 
          required 
        />
        
        {/* Live UI Preview */}
        <div className="relative w-full bg-gradient-to-r from-[#4A0C16] to-[#5C101C] text-white p-6 rounded-3xl overflow-hidden border border-[#E09F26]/30">
          <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: `url(${okirPattern})`, backgroundSize: '240px' }} />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold font-serif text-[#E09F26]">{wordData.term || "Term"}</h2>
            <p className="text-xs text-white/80">{wordData.meaning || "Meaning preview..."}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="bg-[#4A0C16] text-white px-6 py-3 rounded-2xl text-xs font-bold hover:bg-[#31080E] transition"
          >
            {isSubmitting ? "Processing..." : existingData ? "Update Word" : "Publish to Users"}
          </button>
          <button type="button" onClick={onClose} className="text-gray-400 text-xs font-bold px-4">Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default WordOfTheDayConsole;