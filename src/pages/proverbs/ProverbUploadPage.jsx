import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "../../contexts/ToastContext";
import { 
  ArrowLeft, 
  Send, 
  Quote, 
  BookOpen, 
  Info, 
  Layers, 
  Volume2, 
  Upload, 
  CheckCircle2, 
  Tag, 
  X,
  Eye,
  VolumeX
} from "lucide-react"; 

// IMPORT THE OKIR PATTERN DIRECTLY TO MATCH THE UTMOST SYSTEM CORE DESIGN
import okirPattern from "../../assets/okir-pattern.png";
import Loader from "../../components/Loader";

// Import the Confirmation Modal
import ConfirmationModal from "../../components/ConfirmationModal";

// Import your custom hook
import { useSessionStorage } from "../../hooks/useSessionStorage";

// Import your shared utilities
import { processTags, CLOUDINARY_WIDGET_STYLE } from "../../utils/formUtils";

const ProverbUploadPage = ({ changePage, user, editItem = null }) => {
  const { showToast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useSessionStorage("proverb_formData", {
    proverb: "",
    translation: "",
    meaning: "",
    category: "General Life Lessons", 
    audioUrl: "", 
  });
  
  const [tagsInput, setTagsInput] = useSessionStorage("proverb_tags", ""); 

  // --- CLOUDINARY UPLOAD LOGIC ---
  const handleAudioUpload = () => {
    if (!window.cloudinary) {
      showToast("Upload widget not ready. Please refresh.", "error");
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: "diy5guxxs", 
        uploadPreset: "heritage_preset", 
        sources: ["local", "url"],
        resourceType: "auto", 
        clientAllowedFormats: ["mp3", "wav", "m4a", "ogg"],
        multiple: false,
        theme: "minimal",
        styles: CLOUDINARY_WIDGET_STYLE 
      },
      (error, result) => {
        if (!error && result && result.event === "success") {
          setFormData((prev) => ({ ...prev, audioUrl: result.info.secure_url }));
          showToast("Audio uploaded and linked!", "success");
        } else if (error) {
          showToast("Upload failed. Try again.", "error");
        }
      }
    );
    widget.open();
  };

  // --- MODAL STATE ---
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    confirmText: "",
    onConfirm: () => {},
  });

  const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

  useEffect(() => {
    if (editItem) {
      setFormData({
        proverb: editItem.proverb || "",
        translation: editItem.translation || "",
        meaning: editItem.meaning || "",
        category: editItem.category || "General Life Lessons",
        audioUrl: editItem.audioUrl || "",
      });
      setTagsInput(editItem.tags ? editItem.tags.join(", ") : "");
    }
  }, [editItem]);

  const triggerSubmit = (e) => {
    e.preventDefault();
    if (!formData.proverb || !formData.meaning || !formData.category) {
      showToast("Please fill in all required fields.", "error");
      return;
    }
    setConfirmConfig({
      isOpen: true,
      title: editItem ? "Confirm Resubmission" : "Confirm Upload",
      message: editItem 
        ? "Are you sure you want to resubmit this updated proverb?" 
        : "Are you sure you want to publish this new proverb?",
      type: "info",
      confirmText: editItem ? "Resubmit Proverb" : "Upload Proverb",
      onConfirm: executeSubmit
    });
  };

  const executeSubmit = async () => {
    setIsSubmitting(true);
    try {
      const uid = user?.uid || auth?.currentUser?.uid;
      if (!uid) throw new Error("User session not found.");

      const tagsArray = processTags(tagsInput);

      const proverbData = {
        proverb: formData.proverb,
        translation: formData.translation,
        meaning: formData.meaning,
        category: formData.category,
        audioUrl: formData.audioUrl,
        tags: tagsArray, 
        status: "pending",
        updatedAt: serverTimestamp()
      };

      if (editItem && editItem.id) {
        const docRef = doc(db, "proverb", editItem.id);
        await updateDoc(docRef, proverbData);
        showToast("Proverb revised successfully!", "success");
      } else {
        await addDoc(collection(db, "proverb"), {
          ...proverbData,
          createdBy: uid,
          createdAt: serverTimestamp()
        });
        showToast("Proverb uploaded successfully!", "success");
      }
      
      setFormData({ proverb: "", translation: "", meaning: "", category: "General Life Lessons", audioUrl: "" });
      setTagsInput(""); 
      
      sessionStorage.removeItem("proverb_formData");
      sessionStorage.removeItem("proverb_tags");

      changePage("dashboard");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageTitle = editItem ? "Revise Returned Proverb" : "Upload New Proverb";

  return (
    <div className="min-h-screen bg-[#FEF9C3] flex flex-col font-sans antialiased selection:bg-[#4A0C16]/10">
      
      {/* Okir Pattern Strip Accent */}
      <div 
        className="w-full h-8 bg-[#E09F26] border-b border-[#4A0C16]/30 shadow-sm"
        style={{ 
          backgroundImage: `url(${okirPattern})`,
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%' 
        }} 
      />

      {/* Styled Header Component */}
      <header className="bg-[#4A0C16] text-white px-8 py-6 flex items-center justify-between shadow-md border-b border-[#E09F26]/20">
        <div>
          <h1 className="text-2xl font-bold font-serif tracking-wide flex items-center gap-3">
            <Quote size={24} className="text-[#E09F26]" />
            {pageTitle}
          </h1>
          <p className="text-[10px] text-[#E09F26] uppercase tracking-widest font-semibold mt-0.5">MSU Meranaw CHC Content Management Workspace</p>
        </div>
        <button
          onClick={() => changePage("dashboard")}
          className="flex items-center gap-2 hover:text-[#E09F26] transition-colors font-bold text-xs uppercase tracking-wider bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl border border-white/10"
        >
          <ArrowLeft size={14} /> Return to List
        </button>
      </header>

      {/* Main Two-Column Content Frame */}
      <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Left Column: Input Panel Form */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_10px_40px_-6px_rgba(74,12,22,0.06)] border border-[#E09F26]/10">
            <h2 className="text-xl font-bold text-[#4A0C16] font-serif mb-6 border-b pb-4">
              Proverb Specifications Hub
            </h2>
            
            <form onSubmit={triggerSubmit} className="space-y-6">
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Maranao Proverb (Pananaroon)
                </label>
                <textarea
                  required
                  value={formData.proverb}
                  onChange={(e) => setFormData({...formData, proverb: e.target.value})}
                  className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-[#E09F26]/20 focus:border-[#E09F26] outline-none transition-all min-h-[100px] resize-y text-base font-serif text-gray-800 leading-relaxed"
                  placeholder="Enter the proverb in Maranao..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  English Translation
                </label>
                <input
                  type="text"
                  required
                  value={formData.translation}
                  onChange={(e) => setFormData({...formData, translation: e.target.value})}
                  className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-[#E09F26]/20 focus:border-[#E09F26] outline-none transition-all text-sm font-medium text-gray-800"
                  placeholder="Literal or closest English translation..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Metadata Tags
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-[#E09F26]/20 focus:border-[#E09F26] outline-none transition-all text-sm font-medium text-gray-800"
                  placeholder="e.g., respect, family, traditional (comma separated)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Classification Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full border border-gray-200 bg-gray-50/60 p-3.5 rounded-xl focus:ring-2 focus:ring-[#E09F26]/20 focus:border-[#E09F26] focus:bg-white outline-none transition-all cursor-pointer font-semibold text-sm text-gray-800"
                >
                  <option value="Wisdom">Wisdom</option>
                  <option value="Relationships & Community">Relationships & Community</option>
                  <option value="Honor & Respect">Honor & Respect</option>
                  <option value="General Life Lessons">General Life Lessons</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Meaning & Context Documentation
                </label>
                <textarea
                  required
                  value={formData.meaning}
                  onChange={(e) => setFormData({...formData, meaning: e.target.value})}
                  className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-[#E09F26]/20 focus:border-[#E09F26] outline-none transition-all min-h-[120px] resize-y text-sm leading-relaxed text-gray-600"
                  placeholder="Explain the wisdom and cultural context thoroughly..."
                />
              </div>

              {/* Audio Uploader Segment */}
              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  <Volume2 size={14} className="text-[#E09F26]" /> Audio Pronunciation Archive
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      readOnly
                      value={formData.audioUrl}
                      className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3.5 pr-10 text-sm text-gray-500 italic outline-none cursor-not-allowed"
                      placeholder="Click upload to link an audio asset..."
                    />
                    {formData.audioUrl && (
                      <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" size={18} />
                    )}
                  </div>
                  
                  {formData.audioUrl ? (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, audioUrl: "" })}
                      className="flex items-center gap-2 px-6 bg-red-100 text-red-600 font-bold rounded-xl hover:bg-red-200 transition-all shadow-md active:scale-95 border border-red-200"
                    >
                      <X size={16} strokeWidth={2.5} />
                      <span>Remove</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAudioUpload}
                      className="flex items-center gap-2 px-6 bg-[#E09F26] text-[#4A0C16] font-bold rounded-xl hover:bg-[#cf9021] transition-all shadow-md active:scale-95"
                    >
                      <Upload size={16} />
                      <span>Upload</span>
                    </button>
                  )}
                </div>
                {formData.audioUrl && (
                  <p className="text-[10px] text-green-600 font-bold flex items-center gap-1 mt-2 ml-1">
                    <CheckCircle2 size={10} /> Pronunciation track bound accurately.
                  </p>
                )}
              </div>

              {/* Action Submit Control */}
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full mt-8 bg-[#4A0C16] hover:bg-[#31080E] text-white py-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(74,12,22,0.15)] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-[#E09F26]/20"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-3">
                    <Loader size="sm" inline={true} />
                    <span className="text-[10px] tracking-wider text-white">Committing Wisdom Ledger...</span>
                  </div>
                ) : (
                  <>
                    <Send size={14} className="text-[#E09F26]" />
                    {editItem ? "Commit Proverb Changes" : "Publish Proverb to Validation Queue"}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Live Repository Preview Card */}
        <div className="lg:col-span-5 xl:col-span-4 hidden lg:block">
          <div className="sticky top-8 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Eye size={14} className="text-[#E09F26]" /> Live Proverb Card Preview
            </h3>
            
            <div className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(74,12,22,0.04)] overflow-hidden flex flex-col h-[390px] border border-gray-100 group transition-all duration-300 hover:shadow-[0_20px_40px_rgba(74,12,22,0.08)]">
              
              {/* Card Banner Decorative Display */}
              <div className="h-32 w-full bg-[#4A0C16]/5 overflow-hidden relative border-b border-gray-50 flex flex-col items-center justify-center px-6 text-center">
                <Quote size={40} className="text-[#E09F26]/30 absolute left-4 top-4 stroke-[1.5]" />
                {formData.audioUrl ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-full">
                    <Volume2 size={14} className="animate-pulse" />
                    <span className="text-[9px] font-black tracking-wider uppercase">Audio Pronunciation Attached</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-400 rounded-full">
                    <VolumeX size={14} />
                    <span className="text-[9px] font-black tracking-wider uppercase">No Audio Layer Added</span>
                  </div>
                )}
              </div>

              {/* Card Text Content Preview Area */}
              <div className="p-5 flex flex-col justify-between flex-1 bg-white">
                <div className="space-y-2">
                  <span className="text-[9px] text-[#E09F26] bg-[#E09F26]/10 px-2.5 py-1 rounded-md tracking-widest font-bold uppercase inline-block">
                    {formData.category}
                  </span>
                  <h3 className="font-bold text-lg font-serif text-[#4A0C16] line-clamp-3 leading-tight tracking-wide pt-1">
                    "{formData.proverb || "Untitled Proverb Entry"}"
                  </h3>
                  <p className="text-xs italic text-gray-500 line-clamp-2 leading-relaxed">
                    {formData.translation ? `Translation: ${formData.translation}` : "English translation preview displays dynamically here..."}
                  </p>
                </div>
                
                <div className="border-t border-gray-100 pt-3 mt-2">
                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                    {formData.meaning || "Context interpretations and documentation details map out here..."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>

      <ConfirmationModal 
        isOpen={confirmConfig.isOpen} 
        config={confirmConfig} 
        onClose={closeConfirm} 
      />
    </div>
  );
};

export default ProverbUploadPage;