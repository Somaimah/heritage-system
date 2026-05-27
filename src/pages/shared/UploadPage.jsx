import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase/firebase";
import { notifyRole } from "../../services/notificationService";

// IMPORT THE OKIR PATTERN DIRECTLY TO RESOLVE THE BUNDLER PATH
import okirPattern from "../../assets/okir-pattern.png";
import Loader from "../../components/Loader";
import { useToast } from "../../components/ToastContext";

// Import the Confirmation Modal
import ConfirmationModal from "../../components/ConfirmationModal";

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";

import { 
  ArrowLeft, 
  Upload, 
  Save, 
  Image as ImageIcon, 
  FileText, 
  Eye, 
  ImageOff
} from "lucide-react";

const UploadPage = ({ changePage, editItem }) => {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("Artifact");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [origin, setOrigin] = useState("");
  const [author, setAuthor] = useState("");
  const [recordType, setRecordType] = useState("Fun Fact");

  const [imageUrl, setImageUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");

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

  // ================= PRE-FILL FORM FOR EDITING =================
  useEffect(() => {
    if (editItem) {
      setCategory(editItem.category || "Artifact");
      setTitle(editItem.title || "");
      setDescription(editItem.description || "");
      setOrigin(editItem.origin || "");
      setAuthor(editItem.author || "");
      setRecordType(editItem.recordType || "Fun Fact");
      setImageUrl(editItem.imageUrl || "");
      setFileUrl(editItem.fileUrl || "");
    }
  }, [editItem]);

  // ================= SUBMISSION TRIGGERS & EXECUTORS =================

  const triggerSubmit = (e) => {
    e.preventDefault(); // Stop standard form submission
    
    if (!auth.currentUser) {
      return showToast("User not logged in", "error");
    }

    // Configure and open the modal based on edit/new state
    setConfirmConfig({
      isOpen: true,
      title: editItem ? "Confirm Resubmission" : "Confirm Upload",
      message: editItem 
        ? "Are you sure you want to resubmit this updated item to the moderation queue?" 
        : "Are you sure you want to publish this new item to the validation queue?",
      type: "info",
      confirmText: editItem ? "Resubmit Item" : "Upload Item",
      onConfirm: executeSubmit
    });
  };

  const executeSubmit = async () => {
    setLoading(true);

    try {
      const data = {
        title,
        description,
        category,
        imageUrl,
        fileUrl,
        ...(category === "Artifact" && { origin }),
        ...(category === "Publication" && { author }),
        ...(category === "Historical Records" && { recordType }),
        status: "pending", 
      };

      if (editItem) {
        // --- RESUBMIT EXISTING ITEM ---
        const itemRef = doc(db, "culturalItems", editItem.id);
        data.updatedAt = serverTimestamp();
        await updateDoc(itemRef, data);

        try {
          await notifyRole({
            role: "moderator",
            message: `Item resubmitted by encoder: ${title}`,
            type: "upload",
            itemId: editItem.id
          });
        } catch (notifError) {
          console.log("Notification failed:", notifError);
        }

        showToast("Item successfully updated and resubmitted!", "success");
      } else {
        // --- UPLOAD NEW ITEM ---
        data.createdAt = serverTimestamp();
        data.createdBy = auth.currentUser.uid;
        data.createdByEmail = auth.currentUser.email;
        data.encoderId = auth.currentUser.uid;

        const docRef = await addDoc(collection(db, "culturalItems"), data);

        try {
          await notifyRole({
            role: "moderator",
            message: `New item uploaded: ${title}`,
            type: "upload",
            itemId: docRef.id
          });
        } catch (notifError) {
          console.log("Notification failed:", notifError);
        }

        showToast("Upload successful!", "success");
      }

      changePage("dashboard");
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FEF9C3] flex flex-col font-sans antialiased selection:bg-[#4A0C16]/10">
      
      {/* OKIR PATTERN TOP BAR CANVAS */}
      <div 
        className="w-full h-5 bg-[#E09F26] border-b border-[#4A0C16]/30 shadow-sm"
        style={{ 
          backgroundImage: `url(${okirPattern})`,
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%' 
        }} 
      />

      {/* MATCHING NAV BAR HEADER */}
      <header className="bg-[#4A0C16] text-white px-8 py-6 flex items-center justify-between shadow-md border-b border-[#E09F26]/20">
        <div>
          <h1 className="text-2xl font-bold font-serif tracking-wide flex items-center gap-3">
            {editItem ? <Save size={24} className="text-[#E09F26]" /> : <Upload size={24} className="text-[#E09F26]" />}
            {editItem ? "Edit & Resubmit Item" : "Upload Item"}
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

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* LEFT COLUMN: FORM MANIFEST */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_10px_40px_-6px_rgba(74,12,22,0.06)] border border-[#E09F26]/10">
            <h2 className="text-xl font-bold text-[#4A0C16] font-serif mb-6 border-b pb-4">
              Item Specifications Hub
            </h2>
            
            {/* Swapped onSubmit from handleSubmit to triggerSubmit */}
            <form onSubmit={triggerSubmit} className="space-y-6">
              
              {/* Category Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  className="w-full border border-gray-200 bg-gray-50/60 p-3.5 rounded-xl focus:ring-2 focus:ring-[#E09F26]/20 focus:border-[#E09F26] focus:bg-white outline-none transition-all cursor-pointer font-semibold text-sm text-gray-800"
                >
                  <option>Artifact</option>
                  <option>Publication</option>
                  <option>Historical Records</option>
                </select>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Title</label>
                <input 
                  className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-[#E09F26]/20 focus:border-[#E09F26] outline-none transition-all text-sm font-medium text-gray-800" 
                  placeholder="Enter a descriptive archival title..."
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  required 
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Description</label>
                <textarea 
                  className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-[#E09F26]/20 focus:border-[#E09F26] outline-none transition-all min-h-[140px] resize-y text-sm leading-relaxed text-gray-600" 
                  placeholder="Provide deep, clear cultural context and documentation details regarding this item..."
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  required 
                />
              </div>

              {/* Conditional Inputs Based on Category */}
              <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                {category === "Artifact" && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Origin Context</label>
                    <input 
                      className="w-full border border-gray-200 p-3.5 bg-white rounded-xl focus:ring-2 focus:ring-[#E09F26]/20 focus:border-[#E09F26] outline-none transition-all text-sm text-gray-800 font-medium" 
                      placeholder="E.g., Lanao del Sur, Brassware Guild, Era/Period..."
                      value={origin} 
                      onChange={(e) => setOrigin(e.target.value)} 
                    />
                  </div>
                )}

                {category === "Publication" && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Author / Researcher</label>
                    <input 
                      className="w-full border border-gray-200 p-3.5 bg-white rounded-xl focus:ring-2 focus:ring-[#E09F26]/20 focus:border-[#E09F26] outline-none transition-all text-sm text-gray-800 font-medium" 
                      placeholder="Name of scholars, collectors, or cultural authors..."
                      value={author} 
                      onChange={(e) => setAuthor(e.target.value)} 
                    />
                  </div>
                )}

                {category === "Historical Records" && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Record Classification</label>
                    <select 
                      className="w-full border border-gray-200 p-3.5 bg-white rounded-xl focus:ring-2 focus:ring-[#E09F26]/20 focus:border-[#E09F26] outline-none transition-all text-sm text-gray-800 font-semibold cursor-pointer"
                      value={recordType} 
                      onChange={(e) => setRecordType(e.target.value)}
                    >
                      <option>Fun Fact</option>
                      <option>Book</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Media Links Canvas */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                    <ImageIcon size={14} className="text-[#E09F26]" /> Image Resource URL
                  </label>
                  <input 
                    className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-[#E09F26]/20 focus:border-[#E09F26] outline-none transition-all text-sm text-gray-700" 
                    placeholder="https://example.com/archival-photo.jpg"
                    value={imageUrl} 
                    onChange={(e) => setImageUrl(e.target.value)} 
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                    <FileText size={14} className="text-[#E09F26]" /> PDF Document URL (Optional Integration)
                  </label>
                  <input 
                    className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-[#E09F26]/20 focus:border-[#E09F26] outline-none transition-all text-sm text-gray-700" 
                    placeholder="https://example.com/academic-manuscript.pdf"
                    value={fileUrl} 
                    onChange={(e) => setFileUrl(e.target.value)} 
                  />
                </div>
              </div>

              {/* Action Operations Execution Platform */}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full mt-8 bg-[#4A0C16] hover:bg-[#31080E] text-white py-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(74,12,22,0.15)] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-[#E09F26]/20"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <Loader size="sm" inline={true} />
                    <span className="text-[10px] tracking-wider text-white">Committing Archive Ledger...</span>
                  </div>
                ) : (
                  <>
                    {editItem ? <Save size={14} className="text-[#E09F26]" /> : <Upload size={14} className="text-[#E09F26]" />}
                    {editItem ? "Commit Changes & Resubmit" : "Publish to Validation Queue"}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE VISUAL CARD PREVIEW */}
        <div className="lg:col-span-5 xl:col-span-4 hidden lg:block">
          <div className="sticky top-8 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Eye size={14} className="text-[#E09F26]" /> Live Repository Card Preview
            </h3>
            
            {/* Standard Dashboard Card Architecture */}
            <div className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(74,12,22,0.04)] overflow-hidden flex flex-col h-[390px] border border-gray-100 group transition-all duration-300 hover:shadow-[0_20px_40px_rgba(74,12,22,0.08)]">
              
              {/* Image Window Viewport */}
              <div className="h-48 w-full bg-gray-50 overflow-hidden relative border-b border-gray-50 flex items-center justify-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102"
                    alt="System Core Preview"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-gray-300 gap-2">
                    <ImageOff size={32} className="stroke-[1.2] text-gray-300" />
                    <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Media Unlinked</span>
                  </div>
                )}
              </div>

              {/* Dynamic Metadata Output Content Workspace */}
              <div className="p-5 flex flex-col justify-between flex-1 bg-white">
                <div>
                  <h3 className="font-bold text-xl font-serif text-[#4A0C16] line-clamp-2 leading-tight tracking-wide">
                    {title || "Untitled Cultural Record"}
                  </h3>
                  <p className="text-[10px] text-[#E09F26] mt-1.5 uppercase tracking-widest font-bold">
                    {category}
                  </p>
                  <p className="text-sm text-gray-500 mt-3 line-clamp-2 leading-relaxed">
                    {description || "A description item will visualize itself here as you type..."}
                  </p>
                </div>
              </div>
            </div>
          </div>
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

export default UploadPage;