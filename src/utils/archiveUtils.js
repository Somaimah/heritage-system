import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase/firebase";

// 1. Handle Status Changes & Auto-Notifications
export const handleStatusUpdate = async (item, targetCollection, newStatus, feedback, role) => {
  const updateData = {
    status: newStatus,
    feedback: feedback || "",
    isDeleted: false,
    updatedAt: serverTimestamp()
  };
  
  if (newStatus === "posted") updateData.postedAt = serverTimestamp();

  await updateDoc(doc(db, targetCollection, item.id), updateData);

  // Use a fallback name so it works for Items (title) or Proverbs (proverb)
  const itemName = item.title || item.proverb || item.term || "Entry";

  // Notify Encoder
  const encoderId = item.encoderId || item.createdBy;
  if (encoderId) {
    await setDoc(doc(collection(db, "notifications")), {
      userId: encoderId,
      message: `Your entry "${itemName}" status updated to: ${newStatus.toUpperCase()}`,
      itemId: item.id,
      createdAt: serverTimestamp(),
      read: false,
      isReadBy: []
    });
  }

  // Notify Admin on Validation
  if (role === "moderator" && newStatus === "validated") {
    await setDoc(doc(collection(db, "notifications")), {
      targetRole: "admin",
      role: "admin",
      message: `Review required: Moderator validated "${itemName}".`,
      itemId: item.id,
      type: "validation_request",
      createdAt: serverTimestamp(),
      read: false,
      isReadBy: []
    });
  }
};

// 2. Handle Trash
export const handleMoveToTrash = async (itemId, targetCollection, role) => {
  await updateDoc(doc(db, targetCollection, itemId), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: auth.currentUser?.uid || role,
  });
};

// 3. Handle Restore
export const handleRestore = async (itemId, targetCollection) => {
  await updateDoc(doc(db, targetCollection, itemId), {
    isDeleted: false,
    restoredAt: serverTimestamp()
  });
};

// 4. Handle Bookmarking (Works for both Item and Proverb structures)
export const handleToggleBookmark = async (item, bookmarked) => {
  if (!auth.currentUser) throw new Error("You must be logged in to save items.");
  
  const bookmarkId = `${auth.currentUser.uid}_${item.id}`;
  const bookmarkRef = doc(db, "bookmarks", bookmarkId);

  if (bookmarked) {
    await deleteDoc(bookmarkRef);
    return false; // Returns new state
  } else {
    await setDoc(bookmarkRef, {
      userId: auth.currentUser.uid,
      itemId: item.id,
      itemType: item.proverb ? "proverb" : "cultural",
      title: item.title || item.proverb || "",
      imageUrl: item.imageUrl || item.audioUrl || "",
      createdAt: serverTimestamp()
    });
    return true; // Returns new state
  }
};

// 5. Handle View Count
export const incrementItemView = async (itemId, targetCollection) => {
  try {
    await updateDoc(doc(db, targetCollection, itemId), { viewCount: increment(1) });
  } catch (err) {
    console.error("View count error:", err);
  }
};

// 6. Initial Bookmark Check
export const checkIsBookmarked = async (itemId) => {
  if (!auth.currentUser) return false;
  const bookmarkRef = doc(db, "bookmarks", `${auth.currentUser.uid}_${itemId}`);
  const bookmarkSnap = await getDoc(bookmarkRef);
  return bookmarkSnap.exists();
};