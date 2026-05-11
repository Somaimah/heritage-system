import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
  getDocs,
  writeBatch
} from "firebase/firestore";
import { ArrowLeft, Bell, Clock } from "lucide-react";

const NotificationsPage = ({ changePage, params }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Determine where to go back to (handling both 'fromPage' and 'params.fromPage')
  const backDestination = params?.fromPage || "dashboard";

  // ================= 1. LOAD NOTIFICATIONS (Real-time) =================
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const notifList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notifList);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // ================= 2. AUTO-MARK ALL AS READ =================
  // This triggers when the user enters the page
  useEffect(() => {
    const clearBadgeCount = async () => {
      if (!auth.currentUser) return;

      try {
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", auth.currentUser.uid),
          where("read", "==", false)
        );

        const snap = await getDocs(q);
        if (snap.empty) return;

        const batch = writeBatch(db);
        snap.docs.forEach((document) => {
          batch.update(doc(db, "notifications", document.id), { read: true });
        });

        await batch.commit();
      } catch (err) {
        console.error("Error clearing notifications:", err);
      }
    };

    clearBadgeCount();
  }, []);

  const markSingleAsRead = async (id) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5dc] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => changePage(backDestination)}
            className="flex items-center gap-2 text-[#800000] hover:scale-105 transition font-semibold"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-2 text-[#800000]">
            <Bell size={24} />
            <h1 className="text-2xl font-bold font-serif">Notifications</h1>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="text-center py-10 text-gray-600 animate-pulse">
            Fetching your alerts...
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && notifications.length === 0 && (
          <div className="bg-white p-12 rounded-2xl shadow-md text-center border-2 border-dashed border-gray-300">
            <p className="text-gray-500">Your inbox is empty.</p>
          </div>
        )}

        {/* NOTIFICATION LIST */}
        <div className="space-y-4">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markSingleAsRead(n.id)}
              className={`p-5 rounded-2xl shadow-sm transition border-l-8 ${
                n.read
                  ? "bg-white/60 border-gray-300 opacity-80"
                  : "bg-white border-[#800000] scale-[1.01] shadow-md"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                  n.type === 'returned' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {n.type || 'System'}
                </span>
                {!n.read && (
                  <span className="bg-[#D4A017] text-white text-[10px] px-2 py-0.5 rounded-full animate-bounce">
                    NEW
                  </span>
                )}
              </div>

              <p className={`text-lg ${n.read ? "text-gray-700" : "text-[#800000] font-bold"}`}>
                {n.message}
              </p>

              <div className="flex items-center gap-1 text-xs text-gray-500 mt-3">
                <Clock size={12} />
                {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : "Just now"}
              </div>
            </div>
          ))}
        </div>

        {/* BOTTOM BACK BUTTON */}
        <button
          onClick={() => changePage(backDestination)}
          className="mt-10 w-full md:w-auto bg-[#D4A017] text-white px-10 py-3 rounded-xl font-bold shadow-lg hover:bg-[#b88a14] transition"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotificationsPage;