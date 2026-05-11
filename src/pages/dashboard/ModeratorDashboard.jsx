import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";

import { db, auth } from "../../firebase/firebase";
import { signOut } from "firebase/auth";
import { notifyRole, sendNotification } from "../../services/notificationService";

import {
  BookOpen,
  CheckCircle,
  XCircle,
  Clock,
  LogOut,
  User,
  Bell,
  Eye,
  Archive,
  Search // <--- Added Search icon
} from "lucide-react";

const ModeratorDashboard = ({ user, changePage }) => {
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [feedbacks, setFeedbacks] = useState({});
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // ================= SEARCH & FILTER STATE =================
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

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

  // ================= REAL-TIME ITEM LISTENER (ALL ITEMS FOR STATS) =================
  useEffect(() => {
    // Removed the "pending" filter here so we can count Posted and Returned for analytics
    const unsub = onSnapshot(collection(db, "culturalItems"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(list);
    });

    return () => unsub();
  }, []);

  // ================= FILTERS & DERIVED DATA =================
  const pendingItems = items.filter(i => i.status === "pending");
  const postedItems = items.filter(i => i.status === "posted");
  const returnedItems = items.filter(i => i.status === "returned");

  // Extract dynamic categories for the dropdown
  const categories = ["All", ...new Set(items.map(i => i.category).filter(Boolean))];

  // Search & Filter Logic
  const filterFunction = (item) => {
    const matchesSearch = 
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  };

  const filteredPendingItems = pendingItems.filter(filterFunction);
  const filteredPostedItems = postedItems.filter(filterFunction);

  // ================= APPROVE =================
  const approveItem = async (id) => {
    try {
      const item = items.find(i => i.id === id);
  
      await updateDoc(doc(db, "culturalItems", id), {
        status: "validated",
        reviewedBy: auth.currentUser.uid,
        reviewedAt: serverTimestamp()
      });
  
      await notifyRole({
        role: "admin",
        message: `New validated item ready for approval: ${item.title}`,
        type: "validated",
        itemId: id
      });
  
      await sendNotification({
        userId: item.createdBy,
        message: `Your item "${item.title}" passed moderator validation`,
        type: "validated",
        itemId: id
      });
  
      alert("Item validated and sent to admin");
    } catch (err) {
      console.log(err);
      alert(err.message);
    }
  };
  
  // ================= RETURN =================
  const returnItem = async (id) => {
    try {
      const item = items.find(i => i.id === id);
      const feedback = feedbacks[id];
  
      if (!feedback) {
        alert("Feedback required");
        return;
      }
  
      await updateDoc(doc(db, "culturalItems", id), {
        status: "returned",
        feedback,
        reviewedBy: auth.currentUser.uid,
        reviewedAt: serverTimestamp()
      });
  
      await sendNotification({
        userId: item.createdBy,
        message: `Your item "${item.title}" was returned by moderator. Feedback: ${feedback}`,
        type: "returned",
        itemId: id
      });
  
      await notifyRole({
        role: "admin",
        message: `Moderator returned item: ${item.title}`,
        type: "returned",
        itemId: id
      });
  
      alert("Item returned");
    } catch (err) {
      console.log(err);
      alert(err.message);
    }
  };

  // ================= LOGOUT =================
  const handleLogout = async () => {
    await signOut(auth);
    changePage("landing");
  };

  // ================= COMPONENTS =================
  const StatCard = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-2xl shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <p className="text-gray-500 text-sm">{title}</p>
        <div className="text-[#800000]">{icon}</div>
      </div>
      <h2 className="text-3xl font-bold text-[#800000]">{value}</h2>
    </div>
  );

  const TabButton = ({ name, value }) => (
    <button
      onClick={() => setTab(value)}
      className={`px-5 py-2 rounded-xl capitalize font-semibold transition ${
        tab === value ? "bg-[#800000] text-white" : "bg-white border text-[#800000]"
      }`}
    >
      {name}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f5f5dc]">
      {/* HEADER */}
      <header className="bg-[#800000] text-white px-6 lg:px-10 py-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-center gap-3">
            <BookOpen size={30} />
            <div>
              <h1 className="text-2xl font-bold">Moderator Dashboard</h1>
              <p className="text-sm opacity-80">Data Validation & Moderation</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => changePage("notifications", { fromPage: "dashboard" })}
              className="relative bg-white text-[#800000] px-4 py-2 rounded-xl flex items-center gap-2 hover:scale-105 transition"
            >
              <Bell size={18} /> Notifications
              {unreadNotifications > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#800000]">
                  {unreadNotifications}
                </span>
              )}
            </button>

            <div className="bg-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
              <User size={16} />
              <span className="text-sm truncate max-w-[150px]">{user?.email}</span>
            </div>

            <button
              onClick={handleLogout}
              className="bg-[#D4A017] px-4 py-2 rounded-xl flex items-center gap-2 hover:opacity-90 transition"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Pending Validation" value={pendingItems.length} icon={<Clock />} />
          <StatCard title="Total Posted" value={postedItems.length} icon={<Archive />} />
          <StatCard title="Total Returned" value={returnedItems.length} icon={<XCircle />} />
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-3 mb-6">
          <TabButton name="pending" value="pending" />
          <TabButton name="posted" value="posted" />
        </div>

        {/* ================= SEARCH & FILTER BAR ================= */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={`Search in ${tab} items...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000] shadow-sm bg-white"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000] shadow-sm bg-white sm:min-w-[200px]"
          >
            {categories.map((cat, index) => (
              <option key={index} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* ================= PENDING TAB ================= */}
        {tab === "pending" && (
          <>
            {filteredPendingItems.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl shadow-lg text-center text-gray-500">
                {searchTerm || selectedCategory !== "All" ? "No pending items match your search criteria." : "No items currently pending validation."}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPendingItems.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col hover:shadow-xl hover:scale-[1.02] transition-all duration-300 h-full">
                    
                    {/* Fixed Image Height */}
                    <div className="h-48 overflow-hidden relative group shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">No Image</div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition bg-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
                        <Eye size={14} /> Preview
                      </div>
                    </div>
                    
                    {/* Card Content */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="text-lg font-bold text-[#800000] line-clamp-1">{item.title}</h3>
                      <p className="text-sm text-gray-500 mb-2">{item.category}</p>
                      
                      {/* Truncated Description */}
                      <p className="text-sm text-gray-700 line-clamp-2 mb-4">{item.description}</p>
                      
                      {/* Steady Bottom Section via mt-auto */}
                      <div className="mt-auto flex flex-col gap-3">
                        <textarea
                          placeholder="Feedback if returning..."
                          value={feedbacks[item.id] || ""}
                          onChange={(e) => setFeedbacks({ ...feedbacks, [item.id]: e.target.value })}
                          className="border rounded-xl p-2 text-sm w-full focus:outline-none focus:border-[#800000]"
                          rows="2"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => approveItem(item.id)} className="bg-green-600 text-white py-2 rounded-xl text-sm hover:bg-green-700 transition flex justify-center items-center gap-1">
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button onClick={() => returnItem(item.id)} className="bg-red-600 text-white py-2 rounded-xl text-sm hover:bg-red-700 transition flex justify-center items-center gap-1">
                            <XCircle size={14} /> Return
                          </button>
                        </div>
                        <button onClick={() => changePage("itemdetail", { itemId: item.id, fromPage: "dashboard", role: "moderator" })} className="w-full border-2 border-[#800000] text-[#800000] py-2 rounded-xl text-sm hover:bg-[#800000] hover:text-white transition">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ================= POSTED TAB ================= */}
        {tab === "posted" && (
          <>
            {filteredPostedItems.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl shadow-lg text-center text-gray-500">
                {searchTerm || selectedCategory !== "All" ? "No posted items match your search criteria." : "No posted items found."}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPostedItems.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col hover:shadow-xl hover:scale-[1.02] transition-all duration-300 h-full">
                    
                    {/* Fixed Image Height */}
                    <div className="h-48 overflow-hidden relative group shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">No Image</div>
                      )}
                    </div>
                    
                    {/* Card Content */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-bold text-[#800000] text-lg line-clamp-1 mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-500 mb-2">{item.category}</p>
                      <p className="text-sm text-gray-700 line-clamp-2 mb-4">{item.description}</p>
                      
                      {/* Steady Bottom Section via mt-auto */}
                      <div className="mt-auto">
                        <button onClick={() => changePage("itemdetail", { itemId: item.id, fromPage: "dashboard", role: "moderator" })} className="w-full bg-[#800000] text-white py-2 rounded-xl text-sm hover:opacity-90 transition">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default ModeratorDashboard;