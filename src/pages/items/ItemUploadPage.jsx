import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase/firebase";
import { notifyRole } from "../../services/notificationService";

// IMPORT THE OKIR PATTERN DIRECTLY TO RESOLVE THE BUNDLER PATH
import okirPattern from "../../assets/okir-pattern.png";
import Loader from "../../components/Loader";
import { useToast } from "../../contexts/ToastContext";

// Import the Confirmation Modal
import ConfirmationModal from "../../components/ConfirmationModal";
import { detectMediaType } from "../../utils/mediaUtils";

// 🟢 ADDED: Import your new custom hook
import { useSessionStorage } from "../../hooks/useSessionStorage";

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
  ImageOff,
  CheckCircle2,
  X // 🟢 ADDED: X icon for the remove button
} from "lucide-react";

const UploadPage = ({ changePage, editItem }) => {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);

  // 🟢 CHANGED: Swapped standard useState for useSessionStorage
  const [category, setCategory] = useSessionStorage("upload_category", "Artifact");
  const [title, setTitle] = useSessionStorage("upload_title", "");
  const [description, setDescription] = useSessionStorage("upload_desc", "");
  const [tagsInput, setTagsInput] = useSessionStorage("upload_tags", ""); 
  const [origin, setOrigin] = useSessionStorage("upload_origin", "");
  const [author, setAuthor] = useSessionStorage("upload_author", "");
  const [recordType, setRecordType] = useSessionStorage("upload_recordType", "Fun Fact");
  const [imageUrl, setImageUrl] = useSessionStorage("upload_imageUrl", "");
  const [fileUrl, setFileUrl] = useSessionStorage("upload_fileUrl", "");

  // --- CLOUDINARY UPLOAD LOGIC ---
  const handleCloudinaryUpload = (targetField) => {
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
          if (targetField === "image") {
            setImageUrl(result.info.secure_url);
          } else if (targetField === "file") {
            setFileUrl(result.info.secure_url);
          }
          showToast("Media uploaded and linked successfully!", "success");
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

  // ================= PRE-FILL FORM FOR EDITING =================
  useEffect(() => {
    if (editItem) {
      setCategory(editItem.category || "Artifact");
      setTitle(editItem.title || "");
      setDescription(editItem.description || "");
      setTagsInput(editItem.tags ? editItem.tags.join(", ") : ""); 
      setOrigin(editItem.origin || "");
      setAuthor(editItem.author || "");
      setRecordType(editItem.recordType || "Fun Fact");
      setImageUrl(editItem.imageUrl || "");
      setFileUrl(editItem.fileUrl || "");
    }
  }, [editItem]);

  // ================= SUBMISSION TRIGGERS & EXECUTORS =================

  const triggerSubmit = (e) => {
    e.preventDefault(); 
    
    if (!auth.currentUser) {
      return showToast("User not logged in", "error");
    }

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
      const mediaAssets = [];
      
      if (imageUrl) {
        mediaAssets.push({
          url: imageUrl,
          type: detectMediaType(imageUrl),
          isPrimary: true, 
          source: "cloudinary" 
        });
      }
      
      if (fileUrl) {
        mediaAssets.push({
          url: fileUrl,
          type: detectMediaType(fileUrl), 
          isPrimary: false,
          source: "cloudinary" 
        });
      }

      const tagsArray = tagsInput
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);

      const data = {
        title,
        description,
        tags: tagsArray, 
        category,
        media: mediaAssets, 
        imageUrl, 
        fileUrl,  
        ...(category === "Artifact" && { origin }),
        ...(category === "Publication" && { author }),
        ...(category === "Historical Records" && { recordType }),
        status: "pending", 
      };
      
      if (editItem) {
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

      // 🟢 ADDED: Clear all form storage AFTER successful submission
      const keysToRemove = [
        "upload_category", "upload_title", "upload_desc", "upload_tags", 
        "upload_origin", "upload_author", "upload_recordType", 
        "upload_imageUrl", "upload_fileUrl"
      ];
      keysToRemove.forEach(key => sessionStorage.removeItem(key));

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
      
      <div 
        className="w-full h-5 bg-[#E09F26] border-b border-[#4A0C16]/30 shadow-sm"
        style={{ 
          backgroundImage: `url(${okirPattern})`,
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%' 
        }} 
      />

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

      <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_10px_40px_-6px_rgba(74,12,22,0.06)] border border-[#E09F26]/10">
            <h2 className="text-xl font-bold text-[#4A0C16] font-serif mb-6 border-b pb-4">
              Item Specifications Hub
            </h2>
            
            <form onSubmit={triggerSubmit} className="space-y-6">
              
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

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Metadata Tags</label>
                <input 
                  className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-[#E09F26]/20 focus:border-[#E09F26] outline-none transition-all text-sm font-medium text-gray-800" 
                  placeholder="e.g., dance, mindanao, bamboo, traditional (comma separated)"
                  value={tagsInput} 
                  onChange={(e) => setTagsInput(e.target.value)} 
                />
              </div>

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

              <div className="space-y-4 pt-2">
                
                {/* 🟢 MODIFIED: Image Upload with Remove Button */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                    <ImageIcon size={14} className="text-[#E09F26]" /> Image Resource
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="url"
                        readOnly
                        className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3.5 pr-10 text-sm text-gray-500 italic outline-none cursor-not-allowed" 
                        placeholder="Click upload to add an image..."
                        value={imageUrl} 
                      />
                      {imageUrl && (
                        <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" size={18} />
                      )}
                    </div>
                    
                    {imageUrl ? (
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="flex items-center gap-2 px-6 bg-red-100 text-red-600 font-bold rounded-xl hover:bg-red-200 transition-all shadow-md active:scale-95 border border-red-200"
                      >
                        <X size={16} strokeWidth={2.5} />
                        <span>Remove</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCloudinaryUpload("image")}
                        className="flex items-center gap-2 px-6 bg-[#E09F26] text-[#4A0C16] font-bold rounded-xl hover:bg-[#cf9021] transition-all shadow-md active:scale-95"
                      >
                        <Upload size={16} />
                        <span>Upload</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 🟢 MODIFIED: PDF Upload with Remove Button */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 mt-4">
                    <FileText size={14} className="text-[#E09F26]" /> PDF Document (Optional)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="url"
                        readOnly
                        className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3.5 pr-10 text-sm text-gray-500 italic outline-none cursor-not-allowed" 
                        placeholder="Click upload to add a PDF..."
                        value={fileUrl} 
                      />
                      {fileUrl && (
                        <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" size={18} />
                      )}
                    </div>
                    
                    {fileUrl ? (
                      <button
                        type="button"
                        onClick={() => setFileUrl("")}
                        className="flex items-center gap-2 px-6 bg-red-100 text-red-600 font-bold rounded-xl hover:bg-red-200 transition-all shadow-md active:scale-95 border border-red-200"
                      >
                        <X size={16} strokeWidth={2.5} />
                        <span>Remove</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCloudinaryUpload("file")}
                        className="flex items-center gap-2 px-6 bg-[#E09F26] text-[#4A0C16] font-bold rounded-xl hover:bg-[#cf9021] transition-all shadow-md active:scale-95"
                      >
                        <Upload size={16} />
                        <span>Upload</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>

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

        <div className="lg:col-span-5 xl:col-span-4 hidden lg:block">
          <div className="sticky top-8 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Eye size={14} className="text-[#E09F26]" /> Live Repository Card Preview
            </h3>
            
            <div className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(74,12,22,0.04)] overflow-hidden flex flex-col h-[390px] border border-gray-100 group transition-all duration-300 hover:shadow-[0_20px_40px_rgba(74,12,22,0.08)]">
              
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

      <ConfirmationModal 
        isOpen={confirmConfig.isOpen} 
        config={confirmConfig} 
        onClose={closeConfirm} 
      />
    </div>
  );
};

export default UploadPage;