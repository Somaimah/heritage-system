import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
  writeBatch // <-- Added for Step 6
} from "firebase/firestore";
import { ArrowLeft, Bell, Clock, Loader2, BellRing, CheckCheck } from "lucide-react"; // <-- Added CheckCheck for the button
import okirPattern from "../assets/okir-pattern.png";

const NotificationsPage = ({ changePage, params }) => {
  const [directNotifs, setDirectNotifs] = useState([]);
  const [roleNotifs, setRoleNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const backDestination = params?.fromPage || "dashboard";

  // ================= 1. LOAD NOTIFICATIONS (Dual-Stream) =================
  useEffect(() => {
    if (!auth.currentUser) return;

    let unsubDirect = () => {};
    let unsubRole = () => {};

    const setupInbox = async () => {
      try {
        // A. Find out what role the current user is
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};
        const userRole = userData.role?.toLowerCase() || "user";

        const firestoreCreatedAt = userData.createdAt?.toMillis ? userData.createdAt.toMillis() : 0;
        const authCreatedAt = auth.currentUser.metadata.creationTime ? new Date(auth.currentUser.metadata.creationTime).getTime() : 0;
        const userCreatedAtMillis = firestoreCreatedAt || authCreatedAt;

        // Helper filter to hide old messages from new users, but keep history for old users
        const isNotifValidForUser = (n) => {
          if (!userCreatedAtMillis) return true; // Old accounts see everything
          if (!n.createdAt) return true; // Brand new incoming notification is always visible
          const notifTime = n.createdAt.toMillis ? n.createdAt.toMillis() : (n.createdAt.seconds * 1000 || 0);
          return notifTime >= (userCreatedAtMillis - 60000); // Only show if created AFTER registration (with a 1 min buffer)
        };

        // B. Listen for Direct Messages (Specific to this user's UID)
        const qDirect = query(
          collection(db, "notifications"),
          where("userId", "==", auth.currentUser.uid)
        );
        unsubDirect = onSnapshot(qDirect, (snapshot) => {
          const notifs = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(isNotifValidForUser); // <-- Step 4 filter applied here safely
          setDirectNotifs(notifs);
        });

        // C. Listen for Role Messages (Broadcasts to Admins, Encoders, Users, etc.)
        if (userRole) {
          const qRole = query(
            collection(db, "notifications"),
            where("targetRole", "==", userRole)
          );
          unsubRole = onSnapshot(qRole, (snapshot) => {
            const notifs = snapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() }))
              .filter(isNotifValidForUser); // <-- Step 4 filter applied here safely
            setRoleNotifs(notifs);
          });
        }

        setLoading(false);
      } catch (error) {
        console.error("Failed to load inbox streams:", error);
        setLoading(false);
      }
    };

    setupInbox();

    return () => {
      unsubDirect();
      unsubRole();
    };
  }, []);

  // ================= 2. MERGE & SORT NOTIFICATIONS =================
  const allNotifications = [...directNotifs, ...roleNotifs].sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
    return timeB - timeA;
  });

  // ================= 3. SAFE MARK AS READ LOGIC =================
  const markSingleAsRead = async (n) => {
    try {
      const docRef = doc(db, "notifications", n.id);
      const myUid = auth.currentUser?.uid;
      if (!myUid) return;

      if (n.userId) {
        // Direct Personal Message -> Safe to mark read globally for this doc
        await updateDoc(docRef, { read: true });
      } else if (n.targetRole || n.role) {
        // Shared Role Broadcast -> Only add THIS user's UID to the read list
        const currentReadBy = Array.isArray(n.isReadBy) ? n.isReadBy : [];
        if (!currentReadBy.includes(myUid)) {
          await updateDoc(docRef, {
            isReadBy: [...currentReadBy, myUid]
          });
        }
      }
    } catch (err) {
      console.error("Error marking single notification read:", err);
    }
  };

  // ================= 4. STEP 6: MARK ALL AS READ BATCH =================
  const markAllAsRead = async () => {
    try {
      const myUid = auth.currentUser?.uid;
      if (!myUid) return;
      
      const batch = writeBatch(db);
      let hasUpdates = false;

      allNotifications.forEach((n) => {
        const isRead = n.userId 
          ? (n.read === true || n.read === "true")
          : (Array.isArray(n.isReadBy) && n.isReadBy.includes(myUid));

        if (!isRead) {
          const docRef = doc(db, "notifications", n.id);
          if (n.userId) {
            batch.update(docRef, { read: true });
          } else {
            const currentReadBy = Array.isArray(n.isReadBy) ? n.isReadBy : [];
            batch.update(docRef, { isReadBy: [...currentReadBy, myUid] });
          }
          hasUpdates = true;
        }
      });

      if (hasUpdates) await batch.commit();
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const hasUnread = allNotifications.some((n) => {
    return n.userId 
      ? !(n.read === true || n.read === "true")
      : !(Array.isArray(n.isReadBy) && n.isReadBy.includes(auth.currentUser?.uid));
  });

  return (
    <div className="min-h-screen bg-[#FEF9C3] text-gray-800 font-sans antialiased flex flex-col pb-20 animate-fadeIn">
      
      <header className="bg-[#4A0C16]/95 backdrop-blur-md text-white shadow-lg sticky top-0 z-50 border-b border-[#E09F26]/40 flex flex-col transition-all duration-300">
        <div 
          className="w-full h-8 bg-repeat-x bg-center border-b border-[#E09F26]/20 bg-[#4A0C16]"
          style={{ backgroundImage: `url(${okirPattern})`, backgroundSize: 'auto 32px' }}
        />
        <div className="px-6 lg:px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#E09F26]/10 p-2 rounded-xl">
              <Bell size={24} className="text-[#E09F26]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-wide font-serif text-[#FDF5E6]">
                Notifications
              </h1>
              <p className="text-xs tracking-widest text-[#E09F26] uppercase font-semibold">User Activity Inbox</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* STEP 6: Mark All Read Button */}
            {hasUnread && (
              <button
                onClick={markAllAsRead}
                className="bg-[#E09F26]/20 hover:bg-[#E09F26]/40 border border-[#E09F26]/30 text-[#E09F26] hover:text-white px-3 py-2 rounded-xl flex items-center gap-2 font-bold transition duration-300 text-sm shadow-sm"
              >
                <CheckCheck size={18} /> 
                <span className="hidden sm:inline">Mark All Read</span>
              </button>
            )}

            <button
              onClick={() => changePage(backDestination)}
              className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition duration-300 text-sm"
            >
              <ArrowLeft size={18} className="text-[#E09F26]" /> 
              <span>Back</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 lg:p-10 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-12 h-12 text-[#4A0C16] animate-spin" />
          </div>
        ) : (
          <>
            {allNotifications.length === 0 && (
              <div className="bg-white/60 backdrop-blur-sm p-20 rounded-3xl shadow-sm text-center border border-[#E09F26]/20 flex flex-col items-center justify-center max-w-2xl mx-auto">
                <BellRing className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium text-lg italic">
                  Your inbox is empty.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {allNotifications.map((n) => {
                const isRead = n.userId 
                  ? (n.read === true || n.read === "true")
                  : (Array.isArray(n.isReadBy) && n.isReadBy.includes(auth.currentUser?.uid));

                return (
                  <div
                    key={n.id}
                    onClick={() => markSingleAsRead(n)}
                    className={`p-6 rounded-3xl transition-all duration-300 cursor-pointer border-l-8 border-y border-r border-y-transparent border-r-transparent ${
                      isRead
                        ? "bg-white/70 border-l-gray-300 opacity-75 hover:opacity-100 hover:bg-white shadow-[0_4px_25px_rgba(74,12,22,0.01)]"
                        : "bg-white border-l-[#4A0C16] border-r-[#E09F26]/30 border-y-[#E09F26]/30 shadow-[0_10px_25px_-5px_rgba(74,12,22,0.05)] hover:shadow-[0_15px_30px_-5px_rgba(74,12,22,0.1)] hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md ${
                        n.type === 'returned' ? 'bg-red-50 text-red-700 border border-red-100' : 
                        n.type === 'validated' || n.type === 'posted' ? 'bg-green-50 text-green-700 border border-green-100' :
                        'bg-[#FEF9C3] text-[#4A0C16] border border-[#E09F26]/40'
                      }`}>
                        {n.type || 'System'}
                      </span>
                      
                      {!isRead && (
                        <span className="bg-[#E09F26] text-[#4A0C16] text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse shadow-sm">
                          NEW
                        </span>
                      )}
                    </div>

                    <p className={`text-base font-medium leading-relaxed font-sans mb-4 ${isRead ? "text-gray-600" : "text-[#4A0C16] font-semibold"}`}>
                      {n.message}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium pt-2 border-t border-gray-50">
                      <Clock size={14} className="text-[#E09F26]" />
                      <span>{n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : "Just now"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;