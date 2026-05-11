import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase/firebase";
import { signOut } from "firebase/auth";

import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";

import {
  BookOpen,
  LogOut,
  User,
  Bell,
  Bookmark
} from "lucide-react";

const UserDashboard = ({ user, changePage }) => {

  const [items, setItems] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [word, setWord] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // ================= LOAD UNREAD NOTIFICATIONS =================
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", auth.currentUser.uid),
      where("read", "==", false)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setUnreadNotifications(snapshot.size);
    });

    return () => unsub();
  }, []);

  // ================= LOAD ITEMS =================
  useEffect(() => {

    const q = query(
      collection(db, "culturalItems"),
      where("status", "==", "posted")
    );

    const unsub = onSnapshot(q, (snap) => {

      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setItems(list);

    });

    return () => unsub();

  }, []);

  // ================= LOAD BOOKMARKS =================
  useEffect(() => {

    if (!auth.currentUser) return;

    const q = query(
      collection(db, "bookmarks"),
      where("userId", "==", auth.currentUser.uid)
    );

    const unsub = onSnapshot(q, (snap) => {

      setBookmarks(
        snap.docs.map(doc => doc.data().itemId)
      );

    });

    return () => unsub();

  }, []);

  // ================= WORD OF THE DAY =================
  useEffect(() => {

    const unsub = onSnapshot(
      collection(db, "wordOfDay"),
      (snap) => {

        if (!snap.empty) {
          setWord(snap.docs[0].data());
        }

      }
    );

    return () => unsub();

  }, []);

  // ================= FILTER ITEMS =================
  const filteredItems = items.filter(item => {

    const matchesSearch =
      item.title?.toLowerCase()
        .includes(search.toLowerCase());

    const matchesCategory =
      category === "all" ||
      item.category === category;

    return matchesSearch && matchesCategory;

  });

  // ================= LOGOUT =================
  const handleLogout = async () => {

    await signOut(auth);
    changePage("landing");

  };

  // ================= BOOKMARK =================
  const toggleBookmark = async (item) => {

    try {

      const uid = auth.currentUser?.uid;

      if (!uid) {
        alert("User not logged in");
        return;
      }

      const bookmarkRef = doc(
        db,
        "bookmarks",
        `${uid}_${item.id}`
      );

      const isBookmarked =
        bookmarks.includes(item.id);

      if (isBookmarked) {

        await deleteDoc(bookmarkRef);

      } else {

        await setDoc(bookmarkRef, {
          userId: uid,
          itemId: item.id,
          title: item.title,
          category: item.category,
          imageUrl: item.imageUrl || "",
          createdAt: serverTimestamp()
        });

      }

    } catch (err) {

      console.error(err);
      alert(err.message);

    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5dc]">
      {/* ================= HEADER ================= */}
      <header className="bg-[#800000] text-white px-4 md:px-8 py-5 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <BookOpen />
          <h1 className="text-xl font-serif">Cultural Archive</h1>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button onClick={() => changePage("notifications", { fromPage: "dashboard", role: "user" })} className="relative bg-white text-[#800000] px-4 py-2 rounded-lg flex items-center gap-2 hover:scale-105 transition">
            <Bell size={16} /> Notifications
            {unreadNotifications > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {unreadNotifications}
              </span>
            )}
          </button>
          <button onClick={() => changePage("bookmarks")} className="bg-[#D4A017] text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Bookmark size={16} /> {bookmarks.length}
          </button>
          <div className="flex items-center gap-2 text-sm">
            <User size={16} /> <span className="max-w-[180px] truncate">{user?.email}</span>
          </div>
          <button onClick={handleLogout} className="bg-[#D4A017] px-4 py-2 rounded-lg flex items-center gap-2">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        
        {/* ================= WORD OF THE DAY ================= */}
        <div className="mb-6">
          <div className="w-full bg-gradient-to-r from-[#800000] to-[#D4A017] text-white p-6 rounded-2xl shadow-lg">
            {word ? (
              <>
                <p className="text-xs uppercase tracking-wide text-yellow-200">Word of the Day</p>
                <h2 className="text-3xl font-serif mt-1">{word.term}</h2>
                <p className="text-sm mt-2 opacity-90 max-w-2xl">{word.meaning}</p>
              </>
            ) : (
              <p>No word available</p>
            )}
          </div>
        </div>

        {/* ================= SEARCH ================= */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input type="text" placeholder="Search cultural items..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 p-3 border-2 border-gray-300 rounded-lg focus:border-[#800000] focus:outline-none" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="md:w-60 p-3 border-2 border-gray-300 rounded-lg bg-white focus:border-[#800000] focus:outline-none">
            <option value="all">All</option>
            <option value="Artifact">Artifact</option>
            <option value="Publication">Publication</option>
            <option value="Historical Records">Historical Records</option>
          </select>
        </div>

        {/* ================= ITEMS ================= */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No items found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.map(item => {
              const isBookmarked = bookmarks.includes(item.id);
              return (
                <div key={item.id} className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col hover:shadow-xl hover:scale-[1.02] transition h-full">
                  
                  <div className="h-[200px] overflow-hidden relative group bg-gray-100">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image</div>
                    )}
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    <div>
                      <h3 className="text-[#800000] font-bold line-clamp-1">{item.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                    </div>

                    <div className="mt-auto flex gap-2 pt-4">
                      <button onClick={() => changePage("itemdetail", { itemId: item.id, fromPage: "dashboard", role: "user" })} className="flex-1 bg-[#800000] text-white py-2 rounded-lg text-sm">
                        View
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toggleBookmark(item); }} className={`px-3 rounded-lg transition ${isBookmarked ? "bg-[#D4A017] text-white" : "bg-gray-200 hover:bg-[#D4A017] hover:text-white"}`}>
                        <Bookmark size={16} fill={isBookmarked ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default UserDashboard;