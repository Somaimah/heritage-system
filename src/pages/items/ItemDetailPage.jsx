import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase/firebase";
import okirPattern from "../../assets/okir-pattern.png";
import Loader from "../../components/Loader";

// Context & Components
import { useToast } from "../../contexts/ToastContext"; 
import ConfirmationModal from "../../components/ConfirmationModal";

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  collection,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";

import {
  Bookmark,
  FileText,
  X,
  CheckCircle,
  RotateCcw,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Hammer,
  ArrowLeft,
  Volume2,
  ExternalLink,
  Image as ImageIcon
} from "lucide-react";

const InfoCard = ({ label, value, icon: Icon }) => (
  <div className="bg-gray-50/60 border border-gray-100 rounded-2xl p-4 transition-all duration-300 hover:bg-white hover:shadow-[0_4px_20px_-4px_rgba(74,12,22,0.05)]">
    <div className="flex items-center gap-2 mb-1.5">
      {Icon && <Icon size={12} className="text-[#E09F26]" />}
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</p>
    </div>
    <p className="font-semibold text-gray-800 text-sm leading-relaxed">{value || "Not specified"}</p>
  </div>
);

const ItemDetailPage = ({ changePage, itemId, fromPage, role }) => {
  const { showToast } = useToast();
  const [item, setItem] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [previewImage, setPreviewImage] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);

  // --- MODAL STATE ---
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    confirmText: "",
    onConfirm: () => {},
  });

  const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

  const targetCollection = "culturalItems";

  // ================= LOAD ITEM =================
  useEffect(() => {
    if (!itemId) return;
    const itemRef = doc(db, targetCollection, itemId);

    const unsubscribe = onSnapshot(itemRef, (snap) => {
      if (snap.exists()) {
        setItem({ id: snap.id, ...snap.data() });
      } else {
        showToast("The requested heritage item could not be found.", "error");
        changePage(fromPage ? fromPage : "dashboard");
      }
      setLoading(false);
    }, (err) => {
      showToast("Error synchronizing data: " + err.message, "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [itemId, changePage, fromPage, showToast]);

  // ================= VIEW & BOOKMARK LOGIC =================
  useEffect(() => {
    if (role === "user" && itemId && item?.status === "posted") {
      const incrementView = async () => {
        try {
          await updateDoc(doc(db, targetCollection, itemId), { viewCount: increment(1) });
        } catch (err) { console.error("View count error:", err); }
      };
      incrementView();
    }

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user && role === "user" && itemId) {
        try {
          const bookmarkRef = doc(db, "bookmarks", `${user.uid}_${itemId}`);
          const bookmarkSnap = await getDoc(bookmarkRef);
          if (bookmarkSnap.exists()) setBookmarked(true);
        } catch (err) { console.error("Bookmark check error:", err); }
      }
    });

    return () => unsubscribeAuth();
  }, [itemId, role, item?.status]);

  // ================= FIREBASE EXECUTORS & NOTIFICATIONS =================
  const executeStatusChange = async (newStatus, requiresFeedback = false) => {
    try {
      const updateData = {
        status: newStatus,
        feedback: requiresFeedback ? feedback : "",
        isDeleted: false,
        updatedAt: serverTimestamp()
      };
      
      if (newStatus === "posted") updateData.postedAt = serverTimestamp();

      await updateDoc(doc(db, targetCollection, item.id), updateData);

      // 1. Notify Encoder
      const encoderId = item.encoderId || item.createdBy;
      if (encoderId) {
        await setDoc(doc(collection(db, "notifications")), {
          userId: encoderId,
          message: `Your entry "${item.title || item.term}" status updated to: ${newStatus.toUpperCase()}`,
          itemId: item.id,
          createdAt: serverTimestamp(),
          read: false,
          isReadBy: []
        });
      }

      // 2. Notify Admin
      if (role === "moderator" && newStatus === "validated") {
        await setDoc(doc(collection(db, "notifications")), {
          targetRole: "admin",
          role: "admin",
          message: `Review required: Moderator validated "${item.title || item.term}".`,
          itemId: item.id,
          type: "validation_request",
          createdAt: serverTimestamp(),
          read: false,
          isReadBy: []
        });
      }

      showToast(`Record status updated to ${newStatus} successfully.`, "success");
      changePage(fromPage ? fromPage : "dashboard");
    } catch (err) {
      showToast("Update Failed: " + err.message, "error");
    }
  };

  const executeDelete = async () => {
    try {
      await updateDoc(doc(db, targetCollection, item.id), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: auth.currentUser?.uid || role,
      });
      showToast("Item successfully moved to Recycle Bin.", "success");
      changePage(fromPage ? fromPage : "dashboard");
    } catch (err) {
      showToast("Delete Failed: " + err.message, "error");
    }
  };

  const executeRestore = async () => {
    try {
      await updateDoc(doc(db, targetCollection, item.id), {
        isDeleted: false,
        restoredAt: serverTimestamp()
      });
      showToast("Item restored to active records.", "success");
    } catch (err) {
      showToast("Restoration Failed: " + err.message, "error");
    }
  };

  const toggleBookmark = async () => {
    try {
      if (!auth.currentUser) return showToast("You must be logged in to save items.", "info");
      const bookmarkId = `${auth.currentUser.uid}_${item.id}`;
      const bookmarkRef = doc(db, "bookmarks", bookmarkId);

      if (bookmarked) {
        await deleteDoc(bookmarkRef);
        setBookmarked(false);
        showToast("Removed from your collection.", "info");
      } else {
        await setDoc(bookmarkRef, {
          userId: auth.currentUser.uid,
          itemId: item.id,
          itemType: "cultural",
          title: item.title || "",
          imageUrl: item.imageUrl || "",
          createdAt: serverTimestamp()
        });
        setBookmarked(true);
        showToast("Saved to your collection!", "success");
      }
    } catch (err) {
      showToast("Bookmark Action Failed: " + err.message, "error");
    }
  };

  // ================= MODAL TRIGGERS =================
  const triggerStatusChange = (newStatus, requiresFeedback = false) => {
    if (requiresFeedback && !feedback.trim()) {
      return showToast("Please provide feedback for the encoder.", "error");
    }
    
    let config = { isOpen: true, onConfirm: () => executeStatusChange(newStatus, requiresFeedback) };

    if (newStatus === "posted") {
      config.title = "Publish to Live";
      config.message = "Are you sure you want to publish this heritage entry to the public archive?";
      config.type = "security";
      config.confirmText = "Publish Now";
    } else if (newStatus === "validated") {
      config.title = "Verify Entry";
      config.message = "Are you sure you want to validate this entry and send it to the admin for final approval?";
      config.type = "security";
      config.confirmText = "Verify & Forward";
    } else if (newStatus === "returned") {
      config.title = "Return to Encoder";
      config.message = "Are you sure you want to return this entry to the encoder for corrections?";
      config.type = "warning";
      config.confirmText = "Return Entry";
    }

    setConfirmConfig(config);
  };

  const triggerDelete = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Move to Recycle Bin",
      message: "Are you sure you want to move this entry to the Recycle Bin? It will be removed from the public archive.",
      type: "danger",
      confirmText: "Move to Trash",
      onConfirm: executeDelete
    });
  };

  const triggerRestore = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Restore Entry",
      message: "Are you sure you want to restore this item back to the active records?",
      type: "restore",
      confirmText: "Restore Item",
      onConfirm: executeRestore
    });
  };

  if (loading) return <Loader size="md" />;
  if (!item) return <div className="text-center p-20 font-serif text-[#4A0C16]">Heritage Entry Not Found</div>;

  // ================= PERMISSIONS =================
  const isValidationMode = (role === "moderator" && item.status === "pending") || (role === "admin" && (item.status === "validated" || item.status === "pending"));
  const canEdit = (role === "encoder" || role === "admin") && (item.status === "returned" || item.status === "pending");
  const canDelete = role === "admin";
  const hideInternalStats = role === "user" || role === "guest" || fromPage === "overview";
  const hasFeedback = feedback.trim().length > 0;

  // ================= MEDIA NORMALIZATION =================
  const allMedia = [];
  if (item.media && Array.isArray(item.media)) allMedia.push(...item.media);
  if (item.imageUrl && !allMedia.some(m => m.url === item.imageUrl)) {
    allMedia.push({ url: item.imageUrl, type: 'image', isPrimary: true });
  }
  if (item.fileUrl && !allMedia.some(m => m.url === item.fileUrl)) {
    allMedia.push({ url: item.fileUrl, type: 'pdf', isPrimary: false });
  }

  const primaryVisual = allMedia.find(m => m.type === 'image' || m.type === 'audio');
  const secondaryAssets = allMedia.filter(m => m !== primaryVisual);

  return (
    <div className="min-h-screen bg-[#FEF9C3] font-sans antialiased pb-12">
      <div className="w-full h-8 bg-[#E09F26] border-b border-[#4A0C16]/30 shadow-sm" style={{ backgroundImage: `url(${okirPattern})`, backgroundRepeat: 'repeat-x', backgroundSize: 'auto 100%' }} />
      
      <header className="bg-[#4A0C16] text-white px-8 py-6 flex items-center shadow-md">
        <div className="max-w-7xl w-full mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold font-serif tracking-wide">Heritage Detail</h1>
            <p className="text-[10px] text-[#E09F26] uppercase tracking-widest font-semibold mt-0.5">MCHC Digital Archive</p>
          </div>
          <button onClick={() => changePage(fromPage || "dashboard")} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fadeIn">
        <div className="bg-white rounded-3xl shadow-xl border border-[#E09F26]/10 overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-8 p-6 md:p-10">
            
            {/* LEFT COLUMN: VISUALS & MEDIA */}
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-3xl border-2 border-white bg-gray-100 shadow-xl group">
                {primaryVisual?.type === 'image' ? (
                  <div className="cursor-zoom-in" onClick={() => setPreviewImage(primaryVisual.url)}>
                    <img 
                      src={primaryVisual.url} 
                      alt="Primary Heritage Media" 
                      className="w-full h-[520px] object-cover transition-transform duration-700 group-hover:scale-105" 
                    />
                    <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye size={20} />
                    </div>
                  </div>
                ) : primaryVisual?.type === 'audio' ? (
                  <div className="h-[300px] flex flex-col items-center justify-center bg-[#4A0C16] text-[#FEF9C3] p-10 text-center">
                    <Volume2 size={64} className="mb-4 animate-pulse" />
                    <h4 className="font-serif text-xl mb-6">Oral History / Audio Record</h4>
                    <audio controls className="w-full h-12">
                      <source src={primaryVisual.url} type="audio/mpeg" />
                    </audio>
                  </div>
                ) : (
                  <div className="h-[520px] flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                    <ImageIcon size={48} className="text-gray-200 mb-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">No Primary Visual Linked</span>
                    {secondaryAssets.some(a => a.type === 'pdf') && (
                      <span className="text-xs text-[#E09F26] font-bold mt-2 bg-[#E09F26]/10 px-4 py-1.5 rounded-full">
                        Please see attached document below
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Supplemental Archives (PDFs) */}
              {secondaryAssets.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E09F26] flex items-center gap-2">
                    <FileText size={14} /> Supplemental Archives ({secondaryAssets.length})
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {secondaryAssets.map((asset, index) => (
                      <div key={index}>
                        {asset.type === 'pdf' ? (
                          <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-center gap-4">
                               <div className="bg-[#4A0C16]/10 p-4 rounded-full text-[#4A0C16]">
                                  <FileText size={24} />
                               </div>
                               <div>
                                 <h4 className="font-bold text-[#4A0C16] text-sm">Historical Manuscript</h4>
                                 <p className="text-xs text-gray-500">PDF Document attached.</p>
                               </div>
                            </div>
                            <a 
                              href={asset.url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="inline-flex items-center gap-2 bg-[#4A0C16] text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#E09F26] hover:text-[#4A0C16] transition-colors w-full sm:w-auto justify-center"
                            >
                              <ExternalLink size={14} /> Read Document
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: METADATA */}
            <div className="flex flex-col h-full">
              <div className="mb-6">
                 <h2 className="text-4xl font-bold font-serif text-[#4A0C16] leading-tight mb-3">{item.title}</h2>
                 <div className="flex flex-wrap gap-2">
                    <span className="bg-[#FEF9C3] text-[#4A0C16] px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-[#E09F26]/30">{item.category}</span>
                    {item.isDeleted && <span className="bg-red-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">In Recycle Bin</span>}
                 </div>
              </div>
              
              <div className="space-y-6 flex-1 flex flex-col">
                <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#E09F26] mb-3 flex items-center gap-2">
                        <div className="h-px bg-[#E09F26]/30 flex-1"></div> Narrative Description <div className="h-px bg-[#E09F26]/30 flex-1"></div>
                    </h3>
                    <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-6 whitespace-pre-wrap leading-relaxed text-gray-700 text-sm shadow-inner min-h-[120px]">
                      {item.description || "Description pending archival update."}
                    </div>
                </section>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoCard label="Era/Period" value={item.era} icon={Calendar} />
                    <InfoCard label="Primary Material" value={item.material} icon={Hammer} />
                    <InfoCard label="Geographic Origin" value={item.origin} icon={ArrowLeft} />
                    <InfoCard label="Archivist/Author" value={item.author} icon={Edit} />
                    {!hideInternalStats && item.status === "posted" && (
                        <InfoCard label="Engagement" value={`${item.viewCount || 0} Views`} icon={Eye} />
                    )}
                </div>

                {/* MODERATOR FEEDBACK SECTION */}
                {item.status === "returned" && item.feedback && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
                        <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase mb-1">
                            <RotateCcw size={14} /> Correction Required
                        </div>
                        <p className="text-red-800 text-sm italic">"{item.feedback}"</p>
                    </div>
                )}

                {/* INTERACTIVE ACTIONS */}
                <div className="pt-8 border-t border-gray-100 mt-auto">
                    {isValidationMode && !item.isDeleted && (
                        <div className="mb-6 space-y-4 bg-[#FEF9C3]/30 p-4 rounded-2xl border border-[#E09F26]/20">
                            <textarea
                                placeholder="State specific reasons for returning..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="w-full border-2 border-white rounded-xl p-4 text-sm focus:outline-none focus:border-[#E09F26] bg-white/80 shadow-sm transition-all"
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => triggerStatusChange(role === "moderator" ? "validated" : "posted", false)}
                                    disabled={hasFeedback}
                                    className={`flex-1 font-bold py-4 rounded-xl text-xs uppercase flex justify-center items-center gap-2 transition-all ${hasFeedback ? 'bg-gray-200 text-gray-400' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200'}`}
                                >
                                    <CheckCircle size={16} /> {role === "admin" ? "Publish to Live" : "Verify Entry"}
                                </button>
                                <button
                                    onClick={() => triggerStatusChange("returned", true)}
                                    className="flex-1 bg-amber-500 text-white hover:bg-amber-600 font-bold py-4 rounded-xl text-xs uppercase flex justify-center items-center gap-2 shadow-lg shadow-amber-100 transition-all"
                                >
                                    <RotateCcw size={16} /> Return to Encoder
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                        {role === "user" && !item.isDeleted && (
                            <button onClick={toggleBookmark} className={`flex-1 py-4 px-6 rounded-2xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all ${bookmarked ? "bg-[#E09F26] text-[#4A0C16] scale-95" : "bg-[#4A0C16] text-white hover:bg-[#31080E]"}`}>
                                <Bookmark size={16} fill={bookmarked ? "currentColor" : "none"} />
                                {bookmarked ? "Item Saved" : "Save to Collection"}
                            </button>
                        )}
                        
                        {canEdit && !item.isDeleted && (
                            <button onClick={() => changePage("upload", { editItem: item, itemType: "cultural" })} className="flex-1 bg-white text-[#4A0C16] border-2 border-[#4A0C16] font-bold py-4 rounded-2xl text-xs uppercase flex justify-center items-center gap-2 hover:bg-gray-50 transition-all">
                                <Edit size={16} /> Edit Data
                            </button>
                        )}
                        
                        {canDelete && !item.isDeleted && (
                            <button onClick={triggerDelete} className="flex-1 bg-red-50 text-red-600 border-2 border-red-100 font-bold py-4 rounded-2xl text-xs uppercase flex justify-center items-center gap-2 hover:bg-red-600 hover:text-white transition-all">
                                <Trash2 size={16} /> Move to Trash
                            </button>
                        )}

                        {item.isDeleted && canDelete && (
                             <button onClick={triggerRestore} className="flex-1 bg-emerald-600 text-white font-bold py-4 rounded-2xl text-xs uppercase flex justify-center items-center gap-2 hover:bg-emerald-700 transition-all">
                                <RotateCcw size={16} /> Restore Entry
                             </button>
                        )}
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN IMAGE OVERLAY */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-[#4A0C16]/95 backdrop-blur-md flex items-center justify-center p-5 cursor-zoom-out animate-fadeIn" onClick={() => setPreviewImage(false)}>
          <button className="absolute top-8 right-8 text-white hover:rotate-90 transition-transform"><X size={32} /></button>
          <img src={previewImage} alt="Archival Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        </div>
      )}

      {/* 🔐 UNIVERSAL CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        config={confirmConfig}
        onClose={closeConfirm}
      />
    </div>
  );
};

export default ItemDetailPage;