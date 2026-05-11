import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase/firebase";

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
  LogOut,
  Bookmark,
  FileText,
  Eye,
  X,
  CheckCircle,
  XCircle,
  RotateCcw,
  Edit,
  ArrowLeft,
  Trash2 // <--- Added Trash2 icon
} from "lucide-react";

import { signOut } from "firebase/auth";

const ItemDetailPage = ({ changePage, itemId, fromPage, role }) => {
  const [item, setItem] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [previewImage, setPreviewImage] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);

  // ================= LOAD ITEM (REAL-TIME LISTENER) =================
  useEffect(() => {
    if (!itemId) return;

    const itemRef = doc(db, "culturalItems", itemId);

    const unsubscribe = onSnapshot(itemRef, (snap) => {
      if (snap.exists()) {
        setItem({ id: snap.id, ...snap.data() });
      } else {
        alert("Item not found or has been deleted.");
        changePage(fromPage ? fromPage : "dashboard");
      }
      setLoading(false);
    }, (err) => {
      console.error("LOAD ITEM ERROR:", err);
      alert(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [itemId, changePage, fromPage]);

  // ================= USER FEATURES (BOOKMARK CHECK & VIEW COUNT) =================
  useEffect(() => {
    if (role === "user" && itemId) {
      const incrementView = async () => {
        try {
          const itemRef = doc(db, "culturalItems", itemId);
          await updateDoc(itemRef, { viewCount: increment(1) });
        } catch (err) {
          console.error("View count error:", err);
        }
      };
      incrementView();
    }

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user && role === "user" && itemId) {
        try {
          const bookmarkId = `${user.uid}_${itemId}`;
          const bookmarkRef = doc(db, "bookmarks", bookmarkId);
          const bookmarkSnap = await getDoc(bookmarkRef);
          if (bookmarkSnap.exists()) {
            setBookmarked(true);
          }
        } catch (err) {
          console.error("Bookmark check error:", err);
        }
      }
    });

    return () => unsubscribeAuth();
  }, [itemId, role]);

  // ================= BOOKMARK TOGGLE =================
  const toggleBookmark = async () => {
    try {
      if (!auth.currentUser) {
        alert("Login required");
        return;
      }

      const bookmarkId = `${auth.currentUser.uid}_${item.id}`;
      const bookmarkRef = doc(db, "bookmarks", bookmarkId);

      if (bookmarked) {
        await deleteDoc(bookmarkRef);
        setBookmarked(false);
      } else {
        await setDoc(bookmarkRef, {
          userId: auth.currentUser.uid,
          itemId: item.id,
          title: item.title || "",
          imageUrl: item.imageUrl || "",
          createdAt: serverTimestamp()
        });
        setBookmarked(true);
      }
    } catch (err) {
      console.error("BOOKMARK ERROR:", err);
      alert(err.message);
    }
  };

  // ================= ADMIN: DELETE ITEM =================
  const handleDeleteItem = async () => {
    const isConfirmed = window.confirm("Are you sure you want to permanently delete this item? This action cannot be undone.");
    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, "culturalItems", item.id));
        alert("Item successfully deleted from the system.");
        changePage(fromPage ? fromPage : "dashboard");
      } catch (err) {
        console.error("DELETE ERROR:", err);
        alert("Failed to delete item: " + err.message);
      }
    }
  };

  // ================= DYNAMIC STATUS UPDATER =================
  const handleStatusChange = async (newStatus, requiresFeedback = false) => {
    try {
      if (requiresFeedback && !feedback.trim()) {
        alert("Please provide a reason/comment in the feedback box.");
        return;
      }

      const updateData = { status: newStatus };
      
      if (requiresFeedback) {
        updateData.feedback = feedback;
      } else {
        updateData.feedback = ""; 
      }

      if (newStatus === "posted") {
        updateData.postedAt = serverTimestamp();
      }

      await updateDoc(doc(db, "culturalItems", item.id), updateData);

      if (item.encoderId) {
        const actionText = 
          newStatus === "validated" ? "approved by Moderator" :
          newStatus === "posted" ? "approved and posted by Admin" :
          newStatus === "returned" ? `returned. Feedback: ${feedback}` :
          newStatus === "rejected" ? `rejected. Reason: ${feedback}` :
          "updated status";

        const notifRef = doc(collection(db, "notifications"));
        await setDoc(notifRef, {
          userId: item.encoderId,
          message: `Your item "${item.title}" was ${actionText}.`,
          itemId: item.id,
          createdAt: serverTimestamp(),
          read: false
        });
      }

      alert(`Item successfully marked as ${newStatus}`);
      changePage(fromPage ? fromPage : "dashboard");

    } catch (err) {
      console.error("STATUS UPDATE ERROR:", err);
      alert(err.message);
    }
  };

  // ================= LOGOUT =================
  const handleLogout = async () => {
    try {
      await signOut(auth);
      changePage("landing");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5dc] flex items-center justify-center">
        <div className="text-[#800000] text-xl font-bold animate-pulse">Loading Item Details...</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#f5f5dc] flex items-center justify-center">
        <div className="text-red-600 text-xl font-bold">Item not found or has been deleted</div>
      </div>
    );
  }

  // ================= DETERMINE VISIBLE CONTROLS & STATS =================
  const isValidationMode = 
    (role === "moderator" && item.status === "pending") || 
    (role === "admin" && item.status === "validated");

  const isReturnedMode = role === "encoder" && item.status === "returned";
  const hideInternalStats = role === "user" || role === "guest" || fromPage === "overview";

  return (
    <div className="min-h-screen bg-[#f5f5dc]">
      <header className="bg-[#800000] text-white px-8 py-5 flex justify-between items-center shadow-lg">
        <h1 className="text-2xl font-bold">Cultural Heritage Details</h1>
        {role !== "guest" && fromPage !== "overview" && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-[#D4A017] px-4 py-2 rounded-lg hover:opacity-90 transition font-semibold"
          >
            <LogOut size={18} /> Logout
          </button>
        )}
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-10 p-8">
            
            {/* ================= LEFT SIDE (MEDIA) ================= */}
            <div>
              <div
                className="relative overflow-hidden rounded-2xl border bg-gray-100 cursor-zoom-in group shadow-inner"
                onClick={() => setPreviewImage(true)}
              >
                {item.imageUrl ? (
                  <>
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-[550px] object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition duration-300" />
                    <div className="absolute bottom-4 right-4 bg-white/90 text-gray-800 font-semibold px-4 py-2 rounded-full text-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transition shadow-lg">
                      <Eye size={16} /> Preview Full Image
                    </div>
                  </>
                ) : (
                  <div className="h-[550px] flex items-center justify-center text-gray-400 bg-gray-50">
                    No Image Available
                  </div>
                )}
              </div>

              {item.fileUrl && (
                <div className="mt-8">
                  <div className="flex items-center gap-2 text-[#800000] font-bold text-xl mb-4">
                    <FileText /> Document Viewer
                  </div>
                  <div className="border rounded-2xl overflow-hidden shadow-md">
                    <iframe
                      src={item.fileUrl}
                      title="PDF Reader"
                      className="w-full h-[600px] bg-gray-50"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ================= RIGHT SIDE (INFO & ACTIONS) ================= */}
            <div className="flex flex-col h-full">
              <h2 className="text-4xl font-bold text-[#800000] leading-tight">
                {item.title}
              </h2>

              <div className="flex flex-wrap gap-3 mt-4 mb-6">
                <span className="bg-[#800000] text-white px-4 py-2 rounded-full text-sm font-medium shadow-sm">
                  {item.category || "Unknown"}
                </span>
                
                {!hideInternalStats && item.status && (
                  <span className={`px-4 py-2 rounded-full text-sm font-medium shadow-sm capitalize text-white
                    ${item.status === 'posted' ? 'bg-green-600' : 
                      item.status === 'validated' ? 'bg-blue-600' : 
                      item.status === 'returned' || item.status === 'rejected' ? 'bg-red-600' : 
                      'bg-[#D4A017]'}`}
                  >
                    Status: {item.status}
                  </span>
                )}
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-bold text-[#800000] mb-3 border-b-2 border-gray-100 pb-2">Description</h3>
                <div className="bg-[#fafafa] border border-gray-100 rounded-2xl p-5 whitespace-pre-wrap leading-relaxed text-gray-700 shadow-inner min-h-[150px]">
                  {item.description || "No description available."}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {item.origin && (
                  <div className="bg-[#fafafa] border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Origin</p>
                    <p className="font-semibold text-gray-800">{item.origin}</p>
                  </div>
                )}
                {item.author && (
                  <div className="bg-[#fafafa] border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Author</p>
                    <p className="font-semibold text-gray-800">{item.author}</p>
                  </div>
                )}
                {item.recordType && (
                  <div className="bg-[#fafafa] border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Record Type</p>
                    <p className="font-semibold text-gray-800">{item.recordType}</p>
                  </div>
                )}
                
                {!hideInternalStats && item.status === "posted" && (
                  <div className="bg-[#fafafa] border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Views</p>
                    <p className="font-semibold text-gray-800">{item.viewCount || 0}</p>
                  </div>
                )}
              </div>

              {isReturnedMode && item.feedback && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-600 p-5 rounded-r-xl">
                  <h3 className="text-red-800 font-bold text-sm uppercase tracking-wide mb-2 flex items-center gap-2">
                    <XCircle size={18}/> Moderator/Admin Feedback
                  </h3>
                  <p className="text-red-900 italic">"{item.feedback}"</p>
                </div>
              )}

              {/* ================= DYNAMIC ACTION BUTTONS ================= */}
              <div className="mt-auto flex flex-col gap-4 border-t pt-6 border-gray-200">
                
                {isValidationMode && (
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-3">Validation Decision</h3>
                    <textarea
                      placeholder="Write comment/reason here (Required for Return or Reject)..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-4 min-h-[100px] mb-4 focus:outline-none focus:border-[#800000]"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleStatusChange(role === "moderator" ? "validated" : "posted", false)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 shadow-md"
                      >
                        <CheckCircle size={18} /> Approve
                      </button>
                      
                      {role === "moderator" ? (
                        <button
                          onClick={() => handleStatusChange("returned", true)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 shadow-md"
                        >
                          <RotateCcw size={18} /> Return to Encoder
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange("rejected", true)}
                          className="flex-1 bg-red-800 hover:bg-red-900 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 shadow-md"
                        >
                          <XCircle size={18} /> Reject
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* BOTTOM BUTTONS ROW */}
                <div className="flex gap-3">
                  
                  {role === "user" && (
                    <button
                      onClick={toggleBookmark}
                      className={`flex-1 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition shadow-md ${
                        bookmarked ? "bg-[#D4A017]" : "bg-[#800000] hover:bg-red-900"
                      }`}
                    >
                      <Bookmark size={18} fill={bookmarked ? "currentColor" : "none"} />
                      {bookmarked ? "Bookmarked" : "Bookmark Item"}
                    </button>
                  )}

                  {isReturnedMode && (
                     <button
                        onClick={() => changePage("upload", { editItem: item })}
                        className="flex-1 bg-[#D4A017] hover:opacity-90 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 shadow-md"
                      >
                        <Edit size={18} /> Edit Item
                      </button>
                  )}

                  {/* ADMIN DELETE BUTTON (FIXED LOGIC HERE) */}
                  {role === "admin" && item.status === "posted" && (
                    <button
                      onClick={handleDeleteItem}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 shadow-md"
                    >
                      <Trash2 size={18} /> Delete Item
                    </button>
                  )}
                  
                  {/* UNIVERSAL BACK BUTTON */}
                  <button
                    onClick={() => changePage(fromPage ? fromPage : "dashboard")}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 shadow-sm"
                  >
                    <ArrowLeft size={18} /> Back
                  </button>
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </div>

      {previewImage && item.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-5 cursor-zoom-out backdrop-blur-sm"
          onClick={() => setPreviewImage(false)}
        >
          <button
            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition"
            onClick={(e) => { e.stopPropagation(); setPreviewImage(false); }}
          >
            <X size={28} />
          </button>
          <img
            src={item.imageUrl}
            alt={item.title}
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default ItemDetailPage;