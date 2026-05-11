import React, { useEffect, useState } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc,
  deleteDoc,
  getDocs, 
  serverTimestamp 
} from "firebase/firestore";
import { db, auth } from "../../firebase/firebase";
import { signOut } from "firebase/auth";

import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

import {
  Shield, LogOut, Bell, Archive, CheckCircle, Clock, Users, Eye, User, Trash2, Search 
} from "lucide-react";

import { notifyRole, sendNotification } from "../../services/notificationService";

const COLORS = ["#800000", "#D4A017", "#4CAF50"];

const AdminDashboard = ({ changePage }) => {
  const [tab, setTab] = useState("analytics");
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [feedbacks, setFeedbacks] = useState({});
  const [unreadCount, setUnreadCount] = useState(0); 

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // ================= LOAD DATA =================
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "culturalItems"), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    loadUsers();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, "notifications"), where("userId", "==", auth.currentUser.uid), where("read", "==", false));
    const unsub = onSnapshot(q, (snapshot) => setUnreadCount(snapshot.size));
    return () => unsub();
  }, []);

  // ================= ANALYTICS =================
  const allPosted = items.filter(i => i.status === "posted");
  const allValidated = items.filter(i => i.status === "validated");
  const allReturned = items.filter(i => i.status === "returned");

  const statusData = [
    { name: "Posted", value: allPosted.length },
    { name: "Validated", value: allValidated.length },
    { name: "Returned", value: allReturned.length }
  ];

  const categoryMap = {};
  allPosted.forEach(item => {
    const cat = item.category || "Unknown";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });

  const categoryData = Object.keys(categoryMap).map(key => ({ name: key, value: categoryMap[key] }));
  const uniqueCategories = ["All", ...new Set(items.map(item => item.category).filter(Boolean))];

  // ================= FILTERING =================
  const filteredItems = items.filter(item => {
    const matchesSearch = (item.title || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const displayValidated = filteredItems.filter(i => i.status === "validated");
  const displayPosted = filteredItems.filter(i => i.status === "posted");

  // ================= ACTIONS =================
  const handleApprove = async (item) => {
    try {
      await updateDoc(doc(db, "culturalItems", item.id), { status: "posted", postedAt: serverTimestamp() });
      await sendNotification({ userId: item.createdBy, message: `Your item "${item.title}" was published`, type: "posted", itemId: item.id });
      await notifyRole({ role: "user", message: `New heritage item added: ${item.title}`, type: "new_post", itemId: item.id });
      alert("Item approved and posted!");
    } catch (err) { alert(err.message); }
  };

  const handleReturn = async (item) => {
    try {
      const feedback = feedbacks[item.id];
      if (!feedback) return alert("Feedback required");
      await updateDoc(doc(db, "culturalItems", item.id), { status: "returned", feedback, returnedAt: serverTimestamp() });
      await sendNotification({ userId: item.createdBy, message: `Your item "${item.title}" was returned`, type: "returned", itemId: item.id });
      alert("Item returned!");
    } catch (err) { alert(err.message); }
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm("Permanently delete this item?")) {
      try {
        await deleteDoc(doc(db, "culturalItems", itemId));
        alert("Deleted successfully.");
      } catch (err) { alert(err.message); }
    }
  };

  const handleLogout = async () => { await signOut(auth); changePage("landing"); };

  return (
    <div className="min-h-screen bg-[#f5f5dc]">
      <header className="bg-[#800000] text-white px-6 lg:px-10 py-5 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="flex items-center gap-3">
          <Shield size={30} />
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm opacity-80">Archive Management & Analytics</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => changePage("notifications", { fromPage: "dashboard" })} className="relative bg-white text-[#800000] px-4 py-2 rounded-xl flex items-center gap-2 font-semibold hover:scale-105 transition">
            <Bell size={18} /> Notifications
            {unreadCount > 0 && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#800000]">{unreadCount}</span>}
          </button>
          <button onClick={handleLogout} className="bg-[#D4A017] px-4 py-2 rounded-xl flex items-center gap-2 font-semibold"><LogOut size={16} /> Logout</button>
        </div>
      </header>

      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-[#800000]"><p className="text-gray-500 text-sm">Total Items</p><h2 className="text-3xl font-bold text-[#800000]">{items.length}</h2></div>
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-green-500"><p className="text-gray-500 text-sm">Posted</p><h2 className="text-3xl font-bold text-green-600">{allPosted.length}</h2></div>
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-500"><p className="text-gray-500 text-sm">To Validate</p><h2 className="text-3xl font-bold text-blue-600">{allValidated.length}</h2></div>
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-yellow-500"><p className="text-gray-500 text-sm">Users</p><h2 className="text-3xl font-bold text-yellow-600">{users.length}</h2></div>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          {["analytics", "validation", "users", "archive"].map(t => (
            <button key={t} onClick={() => {setTab(t); setSearchQuery("");}} className={`px-6 py-2 rounded-xl capitalize font-bold transition ${tab === t ? "bg-[#800000] text-white shadow-md" : "bg-white border text-[#800000]"}`}>{t}</button>
          ))}
        </div>

        {(tab === "validation" || tab === "archive") && (
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Search items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#800000] outline-none shadow-sm" />
            </div>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-4 py-3 rounded-xl border border-gray-200 focus:border-[#800000] outline-none bg-white min-w-[200px] shadow-sm cursor-pointer">
              {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        )}

        {tab === "analytics" && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6"><h2 className="text-xl font-bold text-[#800000] mb-4">Archive Status</h2><ResponsiveContainer width="100%" height={300}><BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#800000" /></BarChart></ResponsiveContainer></div>
            <div className="bg-white rounded-2xl shadow-lg p-6"><h2 className="text-xl font-bold text-[#800000] mb-4">Categories</h2><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={categoryData} dataKey="value" outerRadius={100}>{categoryData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
          </div>
        )}

        {tab === "validation" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayValidated.map(item => (
              <div key={item.id} className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col hover:shadow-xl transition-all h-full">
                <div className="h-48 overflow-hidden bg-gray-100">{item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>}</div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-[#800000] line-clamp-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 mb-3">{item.category}</p>
                  <div className="mt-auto flex flex-col gap-3">
                    <textarea placeholder="Feedback..." value={feedbacks[item.id] || ""} onChange={(e) => setFeedbacks({ ...feedbacks, [item.id]: e.target.value })} className="border rounded-xl p-2 text-sm focus:border-[#800000] outline-none" rows="2" />
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleApprove(item)} className="bg-green-600 text-white py-2 rounded-xl text-sm font-bold">Approve</button>
                      <button onClick={() => handleReturn(item)} className="bg-red-600 text-white py-2 rounded-xl text-sm font-bold">Return</button>
                    </div>
                    <button onClick={() => changePage("itemdetail", { itemId: item.id, fromPage: "dashboard", role: "admin" })} className="w-full bg-[#800000] text-white py-2 rounded-xl text-sm font-bold">View Details</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "archive" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayPosted.map(item => (
              <div key={item.id} className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col hover:shadow-xl transition-all h-full">
                <div className="h-48 overflow-hidden bg-gray-100">{item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>}</div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-[#800000] text-lg line-clamp-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">{item.category}</p>
                  <div className="mt-auto flex gap-2">
                    <button onClick={() => changePage("itemdetail", { itemId: item.id, fromPage: "dashboard", role: "admin" })} className="flex-1 bg-[#800000] text-white py-2 rounded-xl text-sm font-bold">Details</button>
                    <button onClick={() => handleDeleteItem(item.id)} className="bg-red-600 text-white p-2 rounded-xl hover:bg-red-700 transition" title="Delete"><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "users" && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#800000] text-white font-bold"><tr><th className="p-4">Email</th><th className="p-4">Role</th></tr></thead>
              <tbody>{users.map(u => (<tr key={u.id} className="border-b"><td className="p-4">{u.email}</td><td className="p-4 capitalize">{u.role || "user"}</td></tr>))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;