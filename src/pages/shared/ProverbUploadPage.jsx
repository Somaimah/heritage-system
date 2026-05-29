import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "../../components/ToastContext";
import { ChevronLeft, Send, Quote, BookOpen, Info, Loader2, Layers, Volume2, Upload, CheckCircle2, Tag } from "lucide-react"; // Added Tag

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
    audioUrl: "", 
  });
  
  // <-- ADDED: State for Metadata Tags
  const [tagsInput, setTagsInput] = useState(""); 

  // --- CLOUDINARY UPLOAD LOGIC ---
  const handleAudioUpload = () => {
    // Check if the script is loaded
    if (!window.cloudinary) {
      showToast("Upload widget not ready. Please refresh.", "error");
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: "diy5guxxs", // Your Cloud Name
        uploadPreset: "heritage_preset", // Your Unsigned Preset
        sources: ["local", "url"],
        resourceType: "auto", // Important: Allows audio files
        clientAllowedFormats: ["mp3", "wav", "m4a", "ogg"],
        multiple: false,
        theme: "minimal",
        styles: {
          palette: {
            window: "#FFFFFF",
            windowBorder: "#4A0C16",
            tabIcon: "#E09F26",
            menuIcons: "#4A0C16",
            textDark: "#000000",
            textLight: "#FFFFFF",
            link: "#E09F26",
            action: "#4A0C16",
            inactiveTabIcon: "#4A0C16",
            error: "#F44235",
            inProgress: "#E09F26",
            complete: "#20B832",
            sourceBg: "#F4F1EA"
          }
        }
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
      // <-- ADDED: Pre-fill tags by joining the array back into a comma-separated string
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

      // <-- ADDED: Convert comma-separated string to an array of lowercase strings
      const tagsArray = tagsInput
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);

      const proverbData = {
        proverb: formData.proverb,
        translation: formData.translation,
        meaning: formData.meaning,
        category: formData.category,
        audioUrl: formData.audioUrl,
        tags: tagsArray, // <-- ADDED: Pass the tags array to Firestore
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
      setTagsInput(""); // <-- ADDED: Clear tags input on success
      changePage("dashboard");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageTitle = editItem ? "Revise Returned Proverb" : "Upload New Proverb";
  const pageDescription = editItem 
    ? "Make the necessary corrections and resubmit." 
    : "Preserve traditional wisdom by adding a Maranao proverb and its audio pronunciation.";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        
        <button onClick={() => changePage("dashboard")} className="flex items-center gap-2 text-gray-500 hover:text-[#4A0C16] mb-6 group w-fit">
          <div className="bg-white p-2 rounded-xl border border-gray-200 group-hover:border-[#E09F26]/30 shadow-sm transition-all">
            <ChevronLeft size={16} />
          </div>
          <span className="font-bold text-sm uppercase tracking-wider">Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-[40px] shadow-2xl border border-[#E09F26]/20 overflow-hidden">
          <div className="bg-[#4A0C16] p-10 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E09F26]/20 border border-[#E09F26]/30 rounded-lg mb-4">
                <Quote size={14} className="text-[#E09F26]" />
                <span className="text-[#E09F26] text-[10px] font-black uppercase tracking-widest">Pananaroon</span>
              </div>
              <h1 className="text-3xl font-serif font-bold text-white mb-2">{pageTitle}</h1>
              <p className="text-gray-300 text-sm">{pageDescription}</p>
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
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl p-5 text-lg font-serif text-[#4A0C16] focus:border-[#E09F26] focus:bg-white outline-none transition-all resize-none h-32"
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
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-[#4A0C16] focus:border-[#E09F26] focus:bg-white outline-none transition-all"
                  placeholder="Literal or closest English translation..."
                />
              </div>

              {/* <-- ADDED: Metadata Tags Field --> */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 ml-1">
                  <Tag size={14} className="text-[#E09F26]" /> Metadata Tags
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-[#4A0C16] focus:border-[#E09F26] focus:bg-white outline-none transition-all"
                  placeholder="e.g., respect, family, traditional (comma separated)"
                />
              </div>

              {/* UPDATED AUDIO UPLOAD SECTION */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 ml-1">
                  <Volume2 size={14} className="text-[#E09F26]" /> Audio Pronunciation
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      readOnly
                      value={formData.audioUrl}
                      className="w-full bg-gray-100 border-2 border-gray-100 rounded-2xl p-4 pr-10 text-xs text-gray-500 italic outline-none cursor-not-allowed"
                      placeholder="Click upload to add audio..."
                    />
                    {formData.audioUrl && (
                      <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" size={18} />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAudioUpload}
                    className="flex items-center gap-2 px-6 bg-[#E09F26] text-[#4A0C16] font-bold rounded-2xl hover:bg-[#cf9021] transition-all shadow-md active:scale-95"
                  >
                    <Upload size={18} />
                    <span>Upload</span>
                  </button>
                </div>
                {formData.audioUrl && (
                  <p className="text-[10px] text-green-600 font-bold flex items-center gap-1 ml-2">
                    <CheckCircle2 size={10} /> File ready for submission
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 ml-1">
                  <Layers size={14} className="text-[#E09F26]" /> Classification Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-[#4A0C16] font-medium focus:border-[#E09F26] appearance-none cursor-pointer"
                >
                  <option value="Wisdom">Wisdom</option>
                  <option value="Relationships & Community">Relationships & Community</option>
                  <option value="Honor & Respect">Honor & Respect</option>
                  <option value="General Life Lessons">General Life Lessons</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 ml-1">
                  <Info size={14} className="text-[#E09F26]" /> Meaning & Context
                </label>
                <textarea
                  required
                  value={formData.meaning}
                  onChange={(e) => setFormData({...formData, meaning: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl p-5 text-sm text-[#4A0C16] focus:border-[#E09F26] focus:bg-white outline-none transition-all h-40 resize-none"
                  placeholder="Explain the wisdom and cultural context..."
                />
              </div>
            </div>

            <div className="pt-4 mt-8 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#4A0C16] text-white py-5 rounded-3xl font-bold flex items-center justify-center gap-3 hover:bg-[#31080E] hover:-translate-y-1 shadow-lg transition-all disabled:opacity-70"
              >
                {isSubmitting ? (
                  <><Loader2 className="animate-spin text-[#E09F26]" size={20} /> Processing...</>
                ) : (
                  <><Send size={18} className="text-[#E09F26]" /> {editItem ? "Resubmit Proverb" : "Submit Proverb"}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmationModal isOpen={confirmConfig.isOpen} config={confirmConfig} onClose={closeConfirm} />
    </div>
  );
};

export default ProverbUploadPage;