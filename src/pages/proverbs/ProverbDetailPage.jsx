import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  addDoc,
  collection
} from "firebase/firestore";
import {
  Quote, AlertCircle, Trash2, CheckCircle, XCircle,
  MessageSquare, Edit3, Save, Loader2, RotateCcw, Volume2, X, Eye,
  Sparkles, BookOpen, ShieldCheck
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

// Reusable Stat Card
const InfoCard = ({ label, value, icon: Icon }) => (
  <div className="bg-white/80 border border-[#E09F26]/20 rounded-2xl p-4 transition-all duration-300 hover:shadow-sm flex items-center gap-4">
    {Icon && (
      <div className="bg-[#4A0C16]/5 p-3 rounded-xl border border-[#4A0C16]/10">
        <Icon size={18} className="text-[#E09F26]" />
      </div>
    )}
    <div>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">{label}</p>
      <p className="font-semibold text-[#4A0C16] text-sm leading-relaxed">{value || "Not specified"}</p>
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
          setEditedProverb(data.proverb || data.meranawText || "");
          setEditedMeaning(data.meaning || data.englishTranslation || "");
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
      const itemRef = doc(db, targetCollection, itemId);
      await updateDoc(itemRef, {
        isDeleted: false,
        status: "pending_moderation",
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, "notifications"), {
        targetRole: "moderator",
        message: `System Admin restored the Proverb "${item?.proverb || 'Data'}". Please re-evaluate.`,
        type: "item_restored",
        itemId: itemId,
        createdAt: serverTimestamp(),
        isReadBy: [] 
      });

      showToast("Proverb restored to Moderator queue.", "success");
      changePage("dashboard");
    } catch (err) {
      showToast("Restore failed: " + err.message, "error");
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

  // SAFE STRINGS & ROLE PERMISSIONS
  const safeRole = role ? role.toLowerCase() : "";
  const safeStatus = item?.status ? item.status.toLowerCase() : "";
  
  // Status tag is strictly hidden for public users (user/guest)
  const isStaffOrAdmin = ["admin", "moderator", "staff", "encoder"].includes(safeRole);

  return (
    <div className="min-h-screen bg-[#FEF9C3] font-sans antialiased pb-12">
      
      {/* ORIGINAL HEADER BANNER & OKIR PATTERN */}
      <div 
        className="w-full h-8 bg-[#E09F26] border-b border-[#4A0C16]/30 shadow-sm" 
        style={{ backgroundImage: `url(${okirPattern})`, backgroundRepeat: 'repeat-x', backgroundSize: 'auto 100%' }} 
      />
      
      <header className="bg-[#4A0C16] text-white px-8 py-6 flex items-center shadow-md mb-8">
        <div className="max-w-4xl w-full mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold font-serif tracking-wide">Proverb Detail</h1>
            <p className="text-[10px] text-[#E09F26] uppercase tracking-widest font-semibold mt-0.5">MCHC Digital Archive</p>
          </div>
          <button 
            onClick={() => changePage("dashboard")} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <div className="max-w-4xl mx-auto p-4 md:px-8 animate-fadeIn">
        <div className="bg-white rounded-[32px] shadow-xl border border-[#E09F26]/30 overflow-hidden">
          
          <div className="p-6 md:p-10">
            
            {/* BADGES & METADATA BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 bg-[#FEF9C3] text-[#4A0C16] rounded-lg text-xs font-black uppercase tracking-wider border border-[#E09F26]/40 flex items-center gap-1.5">
                  <BookOpen size={13} className="text-[#E09F26]" />
                  {item.category || "PROVERB"}
                </span>

                {/* Status Badge - Hidden from public users */}
                {isStaffOrAdmin && (
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 ${
                    safeStatus === 'posted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                    item.isDeleted ? 'bg-red-50 text-red-700 border-red-200' : 
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    <ShieldCheck size={13} />
                    Status: {item.isDeleted ? "IN TRASH" : safeStatus.replace('_', ' ')}
                  </span>
                )}
              </div>

              {!isStaffOrAdmin && (
                <span className="text-xs font-semibold text-[#E09F26] tracking-wide flex items-center gap-1">
                  <Sparkles size={14} /> MCHC Heritage Collection
                </span>
              )}
            </div>

            {/* EDITING FORM VS DISPLAY MODE */}
            {isEditing ? (
              <div className="space-y-6 bg-amber-50/40 p-6 rounded-2xl border border-[#E09F26]/30">
                <div>
                  <label className="text-xs font-black text-[#4A0C16] uppercase tracking-wider block mb-2">Meranaw Proverb Text</label>
                  <textarea 
                    value={editedProverb} 
                    onChange={(e) => setEditedProverb(e.target.value)} 
                    className="w-full p-4 text-xl font-serif italic border border-[#E09F26]/30 rounded-xl focus:border-[#E09F26] focus:ring-2 focus:ring-[#E09F26]/20 outline-none bg-white transition-all shadow-xs" 
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-[#4A0C16] uppercase tracking-wider block mb-2">English Meaning / Translation</label>
                  <textarea 
                    value={editedMeaning} 
                    onChange={(e) => setEditedMeaning(e.target.value)} 
                    className="w-full p-4 text-base border border-[#E09F26]/30 rounded-xl focus:border-[#E09F26] focus:ring-2 focus:ring-[#E09F26]/20 outline-none bg-white transition-all shadow-xs" 
                    rows={4}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleSaveRevision} 
                    disabled={processing} 
                    className="flex-1 bg-[#4A0C16] text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#31080E] transition-all shadow-md"
                  >
                    {processing ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Submit Revision
                  </button>
                  <button 
                    onClick={() => setIsEditing(false)} 
                    className="px-6 py-3.5 bg-white text-gray-600 rounded-xl font-bold text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                
                {/* HERO PROVERB SHOWCASE CARD */}
                <div className="bg-[#4A0C16] text-[#FDF5E6] p-8 md:p-10 rounded-2xl relative overflow-hidden shadow-lg border border-[#E09F26]/40">
                  <div 
                    className="absolute inset-0 opacity-15 bg-repeat-x bg-center pointer-events-none" 
                    style={{ backgroundImage: `url(${okirPattern})`, backgroundSize: 'auto 36px' }} 
                  />
                  <Quote size={80} className="absolute -top-4 -left-4 text-[#E09F26] opacity-15 pointer-events-none" />

                  <div className="relative z-10 text-center max-w-3xl mx-auto py-2">
                    <p className="text-2xl md:text-3xl lg:text-4xl font-serif italic font-medium leading-relaxed tracking-wide text-[#FEF9C3] drop-shadow-xs">
                      "{item.proverb || item.meranawText}"
                    </p>
                  </div>
                </div>

                {/* AUDIO PLAYER */}
                {item.audioUrl && (
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50/40 rounded-2xl border border-[#E09F26]/30 flex flex-col sm:flex-row items-center gap-4">
                    <div className="bg-[#4A0C16] p-3 rounded-xl text-[#E09F26] shrink-0 shadow-xs">
                      <Volume2 size={22} />
                    </div>
                    <div className="flex-1 w-full">
                      <p className="text-[#4A0C16] text-[11px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#E09F26] animate-pulse" /> Audio Pronunciation
                      </p>
                      <audio controls className="w-full h-10 rounded-lg">
                        <source src={item.audioUrl} type="audio/mpeg" />
                        <source src={item.audioUrl} type="audio/ogg" />
                        <source src={item.audioUrl} type="audio/wav" />
                        Your browser does not support audio.
                      </audio>
                    </div>
                  </div>
                )}

                {/* MEANING & TRANSLATION SECTION */}
                <div className="bg-gray-50/80 p-6 md:p-8 rounded-2xl border border-gray-200/80">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-5 bg-[#E09F26] rounded-full" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#4A0C16]">English Meaning & Insights</h3>
                  </div>
                  <p className="text-gray-700 text-base md:text-lg leading-relaxed font-normal pl-3">
                    {item.meaning || item.englishTranslation || "No translation specified."}
                  </p>
                </div>

                {/* VIEW STATS (Staff & Admin Only) */}
                {isStaffOrAdmin && safeStatus === "posted" && (
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoCard label="Total Public Views" value={`${item.viewCount || 0} Views`} icon={Eye} />
                  </div>
                )}

                {/* ENCODER: RETURNED STATUS BANNER */}
                {safeStatus === "returned" && (
                  <div className="p-5 bg-red-50 border-l-4 border-red-500 rounded-2xl flex gap-4 items-start shadow-xs">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={22} />
                    <div className="flex-1">
                      <h4 className="text-red-900 font-bold text-xs uppercase tracking-wider">Moderator Revision Request</h4>
                      <p className="text-red-700 italic text-sm mt-1">"{item.feedback || "Please check details and re-submit."}"</p>
                      {safeRole === "encoder" && (
                        <button 
                          onClick={() => setIsEditing(true)} 
                          className="mt-3 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all shadow-xs"
                        >
                          <Edit3 size={14} /> Edit Proverb
                        </button>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* MODERATOR REVIEW PANEL */}
            {(safeRole === "moderator" || safeRole === "admin") && (safeStatus === "pending" || safeStatus === "pending_moderation" || isPending) && !item.isDeleted && (
              <div className="mt-8 pt-6 border-t border-dashed border-[#E09F26]/40 bg-amber-50/50 p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-[#4A0C16] mb-3 flex items-center gap-2">
                  <MessageSquare size={18} className="text-[#E09F26]" /> Moderator Evaluation
                </h3>
                <textarea
                  placeholder="Provide feedback if returning for changes..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-[#E09F26]/30 focus:border-[#E09F26] outline-none bg-white text-sm mb-4 min-h-[90px] shadow-xs"
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => triggerModeratorAction("posted")} 
                    disabled={processing || feedback.trim().length > 0} 
                    className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
                      feedback.trim().length > 0 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    <CheckCircle size={16} /> Approve & Post
                  </button>
                  <button 
                    onClick={() => triggerModeratorAction("returned")} 
                    disabled={processing || !feedback.trim()} 
                    className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
                      !feedback.trim() 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                    }`}
                  >
                    <XCircle size={16} /> Return to Encoder
                  </button>
                </div>
              </div>
            )}

            {/* ADMIN ACTIONS (TRASH / RESTORE) */}
            {safeRole === "admin" && (
              <div className="mt-8 pt-6 border-t border-gray-100 flex gap-3 justify-end">
                {!item.isDeleted ? (
                  <button 
                    onClick={triggerSoftDelete} 
                    disabled={processing} 
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-xs font-bold transition-all border border-red-200"
                  >
                    <Trash2 size={16} /> Move to Trash
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={triggerRestore} 
                      disabled={processing} 
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all border border-emerald-200"
                    >
                      <RotateCcw size={16} /> Restore Proverb
                    </button>
                    <button 
                      onClick={triggerHardDelete} 
                      disabled={processing} 
                      className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      <Trash2 size={16} /> Permanent Delete
                    </button>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      <ConfirmationModal isOpen={confirmConfig.isOpen} config={confirmConfig} onClose={closeConfirm} />
    </div>
  );
};

export default ProverbDetailPage;