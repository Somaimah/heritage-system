import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase/firebase";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { 
  Quote, AlertCircle, Trash2, CheckCircle, XCircle, 
  MessageSquare, Edit3, Save, Loader2, RotateCcw, Volume2, X, Eye
} from "lucide-react";

import { useToast } from "../../contexts/ToastContext";
import ConfirmationModal from "../../components/ConfirmationModal";
import okirPattern from "../../assets/okir-pattern.png";

// Shared database engine
import { 
  handleStatusUpdate, 
  handleMoveToTrash, 
  handleRestore,
  incrementItemView
} from "../../utils/archiveUtils";

// Reusable Stat Card matching ItemDetailPage
const InfoCard = ({ label, value, icon: Icon }) => (
  <div className="bg-gray-50/60 border border-gray-100 rounded-2xl p-4 transition-all duration-300 hover:bg-white hover:shadow-[0_4px_20px_-4px_rgba(74,12,22,0.05)] flex items-center gap-4">
    {Icon && <div className="bg-[#4A0C16]/5 p-3 rounded-xl"><Icon size={20} className="text-[#E09F26]" /></div>}
    <div>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">{label}</p>
      <p className="font-semibold text-gray-800 text-sm leading-relaxed">{value || "Not specified"}</p>
    </div>
  </div>
);

const ProverbDetailPage = ({ changePage, itemId, role, isPending }) => {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Input States
  const [editedProverb, setEditedProverb] = useState("");
  const [editedMeaning, setEditedMeaning] = useState("");
  const [feedback, setFeedback] = useState("");
  
  const { showToast } = useToast();

  // --- MODAL STATE ---
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false, title: "", message: "", type: "warning", confirmText: "", onConfirm: () => {},
  });

  const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });
  const targetCollection = "proverb"; 

  // ================= LOAD ITEM =================
  useEffect(() => {
    const fetchProverb = async () => {
      try {
        const docRef = doc(db, targetCollection, itemId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setItem(data);
          setEditedProverb(data.proverb || "");
          setEditedMeaning(data.meaning || "");
        } else {
          showToast("Proverb not found.", "error");
          changePage("dashboard");
        }
      } catch (error) {
        showToast("Error fetching details", "error");
      } finally {
        setLoading(false);
      }
    };
    if (itemId) fetchProverb();
  }, [itemId, showToast, changePage]);

  // ================= VIEW COUNT LOGIC =================
  useEffect(() => {
    if (role === "user" && itemId && item?.status === "posted") {
      incrementItemView(itemId, targetCollection);
    }
  }, [itemId, role, item?.status]);

  // ================= FIREBASE EXECUTORS =================
  const executeModeratorAction = async (newStatus) => {
    setProcessing(true);
    try {
      await handleStatusUpdate(item, targetCollection, newStatus, newStatus === "returned" ? feedback : (item.feedback || ""), role);
      showToast(newStatus === "posted" ? "Proverb Published!" : "Returned to Encoder", "success");
      changePage("dashboard"); 
    } catch (err) {
      console.error(err);
      showToast("Action failed", "error");
    } finally {
      setProcessing(false);
    }
  };

  const executeSoftDelete = async () => {
    setProcessing(true);
    try {
      await handleMoveToTrash(itemId, targetCollection, role);
      showToast("Moved to Trash", "success");
      changePage("dashboard");
    } catch (err) {
      showToast("Delete failed", "error");
    } finally {
      setProcessing(false);
    }
  };

  const executeRestore = async () => {
    setProcessing(true);
    try {
      await handleRestore(itemId, targetCollection);
      showToast("Proverb Restored", "success");
      changePage("dashboard");
    } catch (err) {
      showToast("Restore failed", "error");
    } finally {
      setProcessing(false);
    }
  };

  const executeHardDelete = async () => {
    setProcessing(true);
    try {
      await deleteDoc(doc(db, targetCollection, itemId));
      showToast("Proverb permanently deleted", "success");
      changePage("dashboard");
    } catch (err) {
      showToast("Permanent delete failed", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveRevision = async () => {
    setProcessing(true);
    try {
      await updateDoc(doc(db, targetCollection, itemId), {
        proverb: editedProverb,
        meaning: editedMeaning,
        status: "pending_moderation",
        lastUpdated: serverTimestamp()
      });
      showToast("Revision submitted!", "success");
      changePage("dashboard");
    } catch (err) {
      showToast("Failed to save", "error");
    } finally {
      setProcessing(false);
    }
  };

  // ================= MODAL TRIGGERS =================
  const triggerModeratorAction = (newStatus) => {
    if (newStatus === "returned" && !feedback.trim()) return showToast("Feedback is required to return an item", "error");
    let config = { isOpen: true, onConfirm: () => executeModeratorAction(newStatus) };
    if (newStatus === "posted") {
      config.title = "Approve & Post"; config.message = "Are you sure you want to publish this proverb to the live archive?"; config.type = "security"; config.confirmText = "Publish Now";
    } else if (newStatus === "returned") {
      config.title = "Return to Encoder"; config.message = "Are you sure you want to return this proverb for revision? The encoder will be notified."; config.type = "warning"; config.confirmText = "Return Proverb";
    }
    setConfirmConfig(config);
  };

  const triggerSoftDelete = () => setConfirmConfig({ isOpen: true, title: "Move to Trash", message: "Are you sure you want to move this proverb to the Trash Bin? It will be removed from public view.", type: "danger", confirmText: "Move to Trash", onConfirm: executeSoftDelete });
  const triggerRestore = () => setConfirmConfig({ isOpen: true, title: "Restore Proverb", message: "Are you sure you want to restore this proverb back to the active records?", type: "restore", confirmText: "Restore Now", onConfirm: executeRestore });
  const triggerHardDelete = () => setConfirmConfig({ isOpen: true, title: "Permanent Delete", message: "WARNING: This action cannot be undone. Are you absolutely sure you want to permanently delete this proverb from the database?", type: "danger", confirmText: "Permanently Delete", onConfirm: executeHardDelete });

  if (loading) return <div className="min-h-screen bg-[#FEF9C3] flex justify-center pt-32"><Loader2 className="animate-spin text-[#E09F26]" size={40} /></div>;
  if (!item) return null;

  // 🟢 SAFE STRINGS & PERMISSIONS
  const safeRole = role ? role.toLowerCase() : "";
  const safeStatus = item?.status ? item.status.toLowerCase() : "";
  const hideInternalStats = safeRole === "user" || safeRole === "guest";

  return (
    <div className="min-h-screen bg-[#FEF9C3] font-sans antialiased pb-12">
      
      {/* HEADER BANNER MATCHING ITEM DETAIL */}
      <div className="w-full h-8 bg-[#E09F26] border-b border-[#4A0C16]/30 shadow-sm" style={{ backgroundImage: `url(${okirPattern})`, backgroundRepeat: 'repeat-x', backgroundSize: 'auto 100%' }} />
      
      <header className="bg-[#4A0C16] text-white px-8 py-6 flex items-center shadow-md mb-8">
        <div className="max-w-4xl w-full mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold font-serif tracking-wide">Proverb Detail</h1>
            <p className="text-[10px] text-[#E09F26] uppercase tracking-widest font-semibold mt-0.5">MCHC Digital Archive</p>
          </div>
          <button onClick={() => changePage("dashboard")} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <div className="max-w-4xl mx-auto p-4 md:px-8 animate-fadeIn">
        <div className="bg-white rounded-[40px] shadow-2xl border border-[#E09F26]/20 overflow-hidden">
          
          <div className="p-8 md:p-12">
            
            {/* TAGS */}
            <div className="flex flex-wrap gap-3 mb-8">
              <span className="px-4 py-2 bg-[#FEF9C3] text-[#A16207] rounded-full text-[10px] font-black uppercase border border-[#FEF08A] tracking-tighter">{item.category}</span>
              <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase border ${safeStatus === 'posted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : item.isDeleted ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                Status: {item.isDeleted ? "IN TRASH" : safeStatus.replace('_', ' ')}
              </span>
            </div>

            {/* CONTENT SECTION */}
            {isEditing ? (
              <div className="space-y-6 bg-gray-50/50 p-6 rounded-3xl border border-dashed border-[#E09F26]/30">
                <div>
                  <label className="text-[10px] font-black text-[#4A0C16] uppercase tracking-widest ml-1">Proverb Text</label>
                  <textarea value={editedProverb} onChange={(e) => setEditedProverb(e.target.value)} className="w-full mt-2 p-4 text-2xl font-serif italic border-2 border-[#E09F26]/20 rounded-2xl focus:border-[#E09F26] outline-none transition-all shadow-inner" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#4A0C16] uppercase tracking-widest ml-1">Meaning</label>
                  <textarea value={editedMeaning} onChange={(e) => setEditedMeaning(e.target.value)} className="w-full mt-2 p-4 text-lg border-2 border-[#E09F26]/20 rounded-2xl focus:border-[#E09F26] outline-none min-h-[140px] shadow-inner" />
                </div>
                <div className="flex gap-4 pt-2">
                  <button onClick={handleSaveRevision} disabled={processing} className="flex-1 bg-[#4A0C16] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#31080E] transition-all">
                    {processing ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Submit Changes
                  </button>
                  <button onClick={() => setIsEditing(false)} className="px-8 py-4 bg-white text-gray-500 rounded-2xl font-bold border border-gray-200">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="animate-fadeIn">
                <div className="relative mb-10">
                  <Quote size={60} className="absolute -top-8 -left-6 text-[#E09F26] opacity-10" />
                  <h1 className="text-4xl md:text-5xl font-serif font-black text-[#4A0C16] italic leading-tight relative z-10">"{item.proverb}"</h1>
                </div>

                {/* --- AUDIO PLAYER SECTION --- */}
                {item.audioUrl && (
                  <div className="mb-10 p-5 sm:p-6 bg-[#4A0C16] rounded-[24px] shadow-[0_10px_25px_rgba(74,12,22,0.15)] border border-[#E09F26]/30 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="bg-gradient-to-br from-[#E09F26] to-[#b37a1a] p-4 rounded-2xl text-[#4A0C16] shrink-0 shadow-inner">
                      <Volume2 size={28} />
                    </div>
                    <div className="flex-1 w-full z-10">
                      <p className="text-[#E09F26] text-[11px] font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#E09F26] animate-pulse"></span> Audio Pronunciation
                      </p>
                      <audio controls className="w-full h-11 rounded-lg">
                        <source src={item.audioUrl} type="audio/mpeg" />
                        <source src={item.audioUrl} type="audio/ogg" />
                        <source src={item.audioUrl} type="audio/wav" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  </div>
                )}

                <div className="pl-6 border-l-4 border-[#E09F26]/30">
                  <h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-[#E09F26] mb-3">Meaning / Translation</h4>
                  <p className="text-xl text-gray-700 leading-relaxed font-medium italic">{item.meaning}</p>
                </div>

                {/* --- ENGAGEMENT / VIEW COUNT (Only for staff) --- */}
                {!hideInternalStats && safeStatus === "posted" && (
                  <div className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2">
                    <InfoCard label="Total Engagement" value={`${item.viewCount || 0} Views`} icon={Eye} />
                  </div>
                )}

                {/* ENCODER: RETURNED STATUS BANNER */}
                {safeStatus === "returned" && !isEditing && (
                  <div className="mt-12 p-6 bg-red-50 border-l-4 border-red-500 rounded-2xl flex gap-4 items-start shadow-sm">
                    <AlertCircle className="text-red-500 shrink-0" size={24} />
                    <div className="flex-1">
                      <h4 className="text-red-800 font-black text-xs uppercase tracking-widest">Moderator Feedback</h4>
                      <p className="text-red-700 italic mt-1 font-medium">"{item.feedback || "Please check details."}"</p>
                      {safeRole === "encoder" && (
                        <button onClick={() => setIsEditing(true)} className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all shadow-md shadow-red-200">
                          <Edit3 size={14} /> Edit for Revision
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- ROLE SPECIFIC PANELS --- */}

            {/* MODERATOR REVIEW PANEL */}
            {(safeRole === "moderator" || safeRole === "admin") && (safeStatus === "pending" || safeStatus === "pending_moderation" || isPending) && !item.isDeleted && (
              <div className="mt-12 pt-8 border-t-2 border-dashed border-[#E09F26]/20 bg-amber-50/30 p-6 rounded-[32px]">
                <h3 className="text-lg font-bold text-[#4A0C16] mb-4 flex items-center gap-2">
                  <MessageSquare size={20} className="text-[#E09F26]" /> Review Decision
                </h3>
                <textarea
                  placeholder="Write feedback if returning to encoder..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full p-4 rounded-2xl border-2 border-[#E09F26]/10 focus:border-[#E09F26] outline-none bg-white text-sm mb-4 min-h-[100px] shadow-sm"
                />
                <div className="flex gap-4">
                  <button onClick={() => triggerModeratorAction("posted")} disabled={processing || feedback.trim().length > 0} className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${feedback.trim().length > 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700'}`}>
                    <CheckCircle size={20} /> Approve & Post
                  </button>
                  <button onClick={() => triggerModeratorAction("returned")} disabled={processing || !feedback.trim()} className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${!feedback.trim() ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-amber-500 text-white shadow-amber-100 hover:bg-amber-600'}`}>
                    <XCircle size={20} /> Return for Fixes
                  </button>
                </div>
              </div>
            )}

            {/* ADMIN ACTION PANEL (TRASH & RESTORE) */}
            {safeRole === "admin" && (
              <div className="mt-12 pt-8 border-t border-gray-100 flex gap-4 justify-end">
                {!item.isDeleted ? (
                  <button onClick={triggerSoftDelete} disabled={processing} className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl font-bold transition-all border border-red-100 shadow-sm">
                    <Trash2 size={18} /> Move to Trash Bin
                  </button>
                ) : (
                  <>
                    <button onClick={triggerRestore} disabled={processing} className="flex-1 sm:flex-none items-center justify-center flex gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl font-bold transition-all border border-emerald-100 shadow-sm">
                      <RotateCcw size={18} /> Restore Proverb
                    </button>
                    <button onClick={triggerHardDelete} disabled={processing} className="flex-1 sm:flex-none items-center justify-center flex gap-2 px-6 py-3 bg-red-600 text-white hover:bg-red-700 rounded-xl font-bold transition-all shadow-md shadow-red-200">
                      <Trash2 size={18} /> Permanent Delete
                    </button>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* 🔐 UNIVERSAL CONFIRMATION MODAL */}
      <ConfirmationModal isOpen={confirmConfig.isOpen} config={confirmConfig} onClose={closeConfirm} />
    </div>
  );
};

export default ProverbDetailPage;