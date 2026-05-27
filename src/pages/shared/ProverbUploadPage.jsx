import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "../../components/ToastContext";
import { ChevronLeft, Send, Quote, BookOpen, Info, Loader2, Layers } from "lucide-react";

// Import the Confirmation Modal
import ConfirmationModal from "../../components/ConfirmationModal";

const ProverbUploadPage = ({ changePage, user, editItem = null }) => {
  const { showToast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    proverb: "",
    translation: "",
    meaning: "",
    category: "General Life Lessons", 
  });

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

  // Automatically repopulate form if editItem has data
  useEffect(() => {
    if (editItem) {
      setFormData({
        proverb: editItem.proverb || "",
        translation: editItem.translation || "",
        meaning: editItem.meaning || "",
        category: editItem.category || "General Life Lessons",
      });
    }
  }, [editItem]);

  // ================= SUBMISSION TRIGGERS & EXECUTORS =================

  const triggerSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.proverb || !formData.meaning || !formData.category) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    // Configure and open the modal based on edit/new state
    setConfirmConfig({
      isOpen: true,
      title: editItem ? "Confirm Resubmission" : "Confirm Upload",
      message: editItem 
        ? "Are you sure you want to resubmit this updated proverb to the moderation queue?" 
        : "Are you sure you want to publish this new proverb to the validation queue?",
      type: "info",
      confirmText: editItem ? "Resubmit Proverb" : "Upload Proverb",
      onConfirm: executeSubmit
    });
  };

  const executeSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const uid = user?.uid || auth?.currentUser?.uid;
      if (!uid) throw new Error("User session not found. Please log in again.");

      if (editItem && editItem.id) {
        // 1. UPDATE EXISTING PROVERB
        const docRef = doc(db, "proverb", editItem.id);
        await updateDoc(docRef, {
          proverb: formData.proverb,
          translation: formData.translation,
          meaning: formData.meaning,
          category: formData.category,
          status: "pending", // Sends back to Moderator queue
          updatedAt: serverTimestamp()
        });

        // 2. NOTIFY MODERATOR ABOUT RESUBMISSION
        await addDoc(collection(db, "notifications"), {
          message: `An Encoder has resubmitted a corrected proverb for review: "${formData.proverb.substring(0, 30)}..."`,
          targetRole: "moderator",
          isReadBy: [],
          createdAt: serverTimestamp(),
          type: "proverb_resubmission"
        });

        showToast("Proverb revised and resubmitted successfully!", "success");

      } else {
        // 1. UPLOAD NEW PROVERB
        await addDoc(collection(db, "proverb"), {
          proverb: formData.proverb,        
          translation: formData.translation, 
          meaning: formData.meaning,        
          category: formData.category,      
          status: "pending",      
          createdBy: uid,
          createdAt: serverTimestamp()
        });
        
        // 2. NOTIFY MODERATOR ABOUT NEW UPLOAD
        await addDoc(collection(db, "notifications"), {
          message: `An Encoder has uploaded a new proverb for review: "${formData.proverb.substring(0, 30)}..."`,
          targetRole: "moderator",
          isReadBy: [],
          createdAt: serverTimestamp(),
          type: "proverb_submission"
        });

        showToast("Proverb uploaded successfully! Sent to Moderator for validation.", "success");
      }
      
      setFormData({ proverb: "", translation: "", meaning: "", category: "General Life Lessons" });
      changePage("dashboard");
      
    } catch (err) {
      console.error("Upload Error:", err);
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageTitle = editItem ? "Revise Returned Proverb" : "Upload New Proverb";
  const pageDescription = editItem 
    ? "Make the necessary corrections requested by the moderator and resubmit." 
    : "Preserve traditional wisdom by adding a Maranao proverb, its literal translation, and its cultural context.";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        
        <button 
          onClick={() => changePage("dashboard")}
          className="flex items-center gap-2 text-gray-500 hover:text-[#4A0C16] transition-colors mb-6 group w-fit"
        >
          <div className="bg-white p-2 rounded-xl border border-gray-200 group-hover:border-[#E09F26]/30 shadow-sm transition-all">
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          </div>
          <span className="font-bold text-sm uppercase tracking-wider">Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-[40px] shadow-2xl shadow-[#4A0C16]/5 border border-[#E09F26]/20 overflow-hidden">
          
          <div className="bg-[#4A0C16] p-10 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E09F26]/20 border border-[#E09F26]/30 rounded-lg mb-4">
                <Quote size={14} className="text-[#E09F26]" />
                <span className="text-[#E09F26] text-[10px] font-black uppercase tracking-widest">Pananaroon</span>
              </div>
              <h1 className="text-3xl font-serif font-bold text-white mb-2">{pageTitle}</h1>
              <p className="text-gray-300 text-sm font-medium max-w-lg">{pageDescription}</p>
            </div>
            <Quote size={140} className="absolute -right-6 -bottom-10 text-white/5 rotate-12" />
          </div>

          <form onSubmit={triggerSubmit} className="p-6 sm:p-10 space-y-8">
            <div className="space-y-6">
              
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 ml-1">
                  <BookOpen size={14} className="text-[#E09F26]" /> Maranao Proverb
                </label>
                <textarea
                  required
                  value={formData.proverb}
                  onChange={(e) => setFormData({...formData, proverb: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl p-5 text-lg font-serif text-[#4A0C16] focus:border-[#E09F26] focus:bg-white focus:ring-4 focus:ring-[#E09F26]/10 outline-none transition-all resize-none h-32 shadow-sm"
                  placeholder="Enter the proverb in Maranao..."
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 ml-1">
                  English Translation
                </label>
                <input
                  type="text"
                  required
                  value={formData.translation}
                  onChange={(e) => setFormData({...formData, translation: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-[#4A0C16] focus:border-[#E09F26] focus:bg-white focus:ring-4 focus:ring-[#E09F26]/10 outline-none transition-all shadow-sm"
                  placeholder="Literal or closest English translation..."
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 ml-1">
                  <Layers size={14} className="text-[#E09F26]" /> Classification Category
                </label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-[#4A0C16] font-medium focus:border-[#E09F26] focus:bg-white focus:ring-4 focus:ring-[#E09F26]/10 outline-none transition-all shadow-sm appearance-none cursor-pointer"
                  >
                    <option value="Wisdom">Wisdom</option>
                    <option value="Relationships & Community">Relationships & Community</option>
                    <option value="Honor & Respect">Honor & Respect</option>
                    <option value="General Life Lessons">General Life Lessons (Fallback)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 ml-1">
                  <Info size={14} className="text-[#E09F26]" /> Meaning & Context
                </label>
                <textarea
                  required
                  value={formData.meaning}
                  onChange={(e) => setFormData({...formData, meaning: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl p-5 text-sm text-[#4A0C16] focus:border-[#E09F26] focus:bg-white focus:ring-4 focus:ring-[#E09F26]/10 outline-none transition-all h-40 shadow-sm resize-none"
                  placeholder="Explain the wisdom behind the proverb and the situations where it is typically used..."
                />
              </div>
            </div>

            <div className="pt-4 mt-8 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#4A0C16] text-white py-5 rounded-3xl font-bold flex items-center justify-center gap-3 hover:bg-[#31080E] hover:-translate-y-1 shadow-[0_10px_25px_rgba(74,12,22,0.2)] transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed border border-[#E09F26]/20"
              >
                {isSubmitting ? (
                  <><Loader2 className="animate-spin text-[#E09F26]" size={20} /> Processing...</>
                ) : (
                  <><Send size={18} className="text-[#E09F26]" /> {editItem ? "Resubmit Proverb for Review" : "Submit Proverb for Review"}</>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>

      {/* 🔐 UNIVERSAL CONFIRMATION MODAL */}
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen} 
        config={confirmConfig} 
        onClose={closeConfirm} 
      />
    </div>
  );
};

export default ProverbUploadPage;