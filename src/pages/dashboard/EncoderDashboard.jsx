import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase/firebase";
import { signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import {
  BookOpen, Upload, LogOut, User, Bell, Sparkles, Eye, RotateCcw, Search, Clock, Archive
} from "lucide-react";
import { notifyRole } from "../../services/notificationService";

const EncoderDashboard = ({ user, changePage }) => {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("posted");
  const [showWord, setShowWord] = useState(false);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const categories = ["All", "Artifact", "Historical Record", "Publication"];

  const [wordData, setWordData] = useState({ term: "", translation: "", meaning: "" });
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // ================= LOAD ITEMS (STRICT REAL-TIME) =================
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "culturalItems"),
      where("encoderId", "==", auth.currentUser.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(list);
    }, (err) => console.error("Firestore Error:", err));

    return () => unsub();
  }, []);

  // ================= LOAD NOTIFICATIONS =================
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, "notifications"), where("userId", "==", auth.currentUser.uid), where("read", "==", false));
    const unsub = onSnapshot(q, (snap) => setUnreadNotifications(snap.size));
    return () => unsub();
  }, []);

  // ================= HANDLERS =================
  const handleLogout = async () => { await signOut(auth); changePage("landing"); };

  const formatDate = (ts) => {
    if (!ts) return "Just now";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const saveWord = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "wordOfDay", "today"), {
        ...wordData,
        updatedAt: serverTimestamp()
      });
      await notifyRole({
        role: "user",
        message: `New Word of the Day published: ${wordData.term}`,
        type: "new_word"
      });
      alert("Word published!");
      setShowWord(false);
      setWordData({ term: "", translation: "", meaning: "" });
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // ================= FILTERING LOGIC =================
  const getFilteredItems = (statusList) => {
    return statusList.filter(item => {
      const titleMatch = (item.title || "").toLowerCase().includes(searchQuery.toLowerCase());
      const catMatch = selectedCategory === "All" || item.category === selectedCategory;
      return titleMatch && catMatch;
    });
  };

  const postedItems = getFilteredItems(items.filter(i => i.status === "posted"));
  const submissionItems = getFilteredItems(items.filter(i => ["pending", "validated", "returned"].includes(i.status)));
  const returnedItems = items.filter(i => i.status === "returned");

  return (
    <div className="min-h-screen bg-[#f5f5dc]">
      {/* HEADER */}
      <header className="bg-[#800000] text-white px-6 lg:px-10 py-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <BookOpen size={30} />
            <div>
              <h1 className="text-2xl font-bold">Encoder Dashboard</h1>
              <p className="text-sm opacity-80">Heritage Management</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => changePage("notifications", { fromPage: "dashboard" })} className="relative bg-white text-[#800000] px-4 py-2 rounded-xl flex items-center gap-2 hover:scale-105 transition">
              <Bell size={18} /> Notifications
              {unreadNotifications > 0 && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#800000]">{unreadNotifications}</span>}
            </button>
            <div className="bg-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
              <User size={16} />
              <span className="text-sm truncate max-w-[150px]">{user?.email}</span>
            </div>
            <button onClick={handleLogout} className="bg-[#D4A017] px-4 py-2 rounded-xl flex items-center gap-2 hover:opacity-90 transition">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <p className="text-gray-500 text-sm">Total Uploads</p>
              <div className="text-[#800000]"><BookOpen size={20}/></div>
            </div>
            <h2 className="text-3xl font-bold text-[#800000]">{items.length}</h2>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <p className="text-gray-500 text-sm">Pending</p>
              <div className="text-[#800000]"><Clock size={20}/></div>
            </div>
            <h2 className="text-3xl font-bold text-[#800000]">{items.filter(i=>i.status==="pending").length}</h2>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <p className="text-gray-500 text-sm">Returned</p>
              <div className="text-[#800000]"><RotateCcw size={20}/></div>
            </div>
            <h2 className="text-3xl font-bold text-[#800000]">{items.filter(i=>i.status==="returned").length}</h2>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <p className="text-gray-500 text-sm">Posted</p>
              <div className="text-[#800000]"><Archive size={20}/></div>
            </div>
            <h2 className="text-3xl font-bold text-[#800000]">{items.filter(i=>i.status==="posted").length}</h2>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button onClick={() => changePage("upload")} className="bg-[#800000] text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:opacity-90 transition shadow-md">
            <Upload size={18} /> Upload Item
          </button>
          <button onClick={() => setShowWord(!showWord)} className="bg-[#D4A017] text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:opacity-90 transition shadow-md">
            <Sparkles size={18} /> Word of the Day
          </button>
        </div>

        {/* ================= WORD OF DAY FORM + PREVIEW ================= */}
        {showWord && (
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg mb-8 border border-gray-100 animate-fadeIn">
            <h2 className="text-2xl font-bold text-[#800000] mb-6">Publish Word of the Day</h2>
            <form onSubmit={saveWord} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Word (e.g. Mabalos)" value={wordData.term} onChange={(e) => setWordData({ ...wordData, term: e.target.value })} className="w-full border p-3 rounded-xl focus:outline-none focus:border-[#800000]" required />
                <input placeholder="Translation (e.g. Thank you)" value={wordData.translation} onChange={(e) => setWordData({ ...wordData, translation: e.target.value })} className="w-full border p-3 rounded-xl focus:outline-none focus:border-[#800000]" required />
              </div>
              <textarea placeholder="Meaning" value={wordData.meaning} onChange={(e) => setWordData({ ...wordData, meaning: e.target.value })} className="w-full border p-3 rounded-xl focus:outline-none focus:border-[#800000]" rows={2} required />
              
              {/* LIVE PREVIEW BOX */}
              <div className="mt-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Live User Dashboard Preview:</p>
                <div className="w-full bg-gradient-to-r from-[#800000] to-[#D4A017] text-white p-6 rounded-2xl shadow-lg">
                    <p className="text-xs uppercase tracking-wide text-yellow-200">Word of the Day</p>
                    <h2 className="text-3xl font-serif mt-1">{wordData.term || "Term"}</h2>
                    <p className="text-sm mt-2 opacity-90 max-w-2xl">{wordData.meaning || "The word's meaning will be displayed here for the users."}</p>
                </div>
              </div>

              <button type="submit" className="bg-[#800000] text-white px-10 py-3 rounded-xl font-bold hover:opacity-90 transition mt-4">Publish Word</button>
            </form>
          </div>
        )}

        {/* TABS NAVIGATION */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button onClick={()=>{setTab("posted"); setSearchQuery("");}} className={`px-6 py-2 rounded-xl font-bold transition ${tab==="posted" ? "bg-[#800000] text-white" : "bg-white text-[#800000] border border-[#800000]"}`}>Posted Items</button>
          <button onClick={()=>{setTab("submissions"); setSearchQuery("");}} className={`px-6 py-2 rounded-xl font-bold transition ${tab==="submissions" ? "bg-[#800000] text-white" : "bg-white text-[#800000] border border-[#800000]"}`}>My Submissions</button>
          <button onClick={()=>{setTab("returned"); setSearchQuery("");}} className={`px-6 py-2 rounded-xl font-bold transition ${tab==="returned" ? "bg-[#800000] text-white" : "bg-white text-[#800000] border border-[#800000]"}`}>Returned Items</button>
        </div>

        {/* ================= POSTED TAB ================= */}
        {tab === "posted" && (
          <div className="animate-fadeIn">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search posted items..." 
                  className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#800000] outline-none shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#800000] outline-none bg-white min-w-[160px] shadow-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {postedItems.map(item => (
                <div key={item.id} className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col hover:shadow-xl transition-all h-full">
                  <div className="h-48 overflow-hidden bg-gray-100">
                    {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" alt=""/> : <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-[#800000] text-lg line-clamp-1">{item.title}</h3>
                    <p className="text-xs text-gray-500 mb-4">{item.category}</p>
                    <button onClick={() => changePage("itemdetail", { itemId: item.id, fromPage: "dashboard", role: "encoder" })} className="mt-auto w-full bg-[#800000] text-white py-2 rounded-xl text-sm">View Details</button>
                  </div>
                </div>
              ))}
              {postedItems.length === 0 && <p className="col-span-full text-center py-10 text-gray-400 italic">No posted items found.</p>}
            </div>
          </div>
        )}

        {/* ================= SUBMISSIONS TAB ================= */}
        {tab === "submissions" && (
          <div className="animate-fadeIn">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search by name or status..." 
                  className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#800000] outline-none shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#800000] outline-none bg-white min-w-[160px] shadow-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="bg-white rounded-2xl shadow-md overflow-hidden overflow-x-auto border border-gray-100">
              <table className="w-full text-left">
                <thead className="bg-[#800000] text-white">
                  <tr>
                    <th className="p-4">Item Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Date Uploaded</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissionItems.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50 transition">
                      <td className="p-4 font-bold text-gray-800">{item.title}</td>
                      <td className="p-4 text-sm text-gray-600">{item.category}</td>
                      <td className="p-4 text-sm text-gray-600">{formatDate(item.createdAt)}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-white text-[10px] uppercase font-bold tracking-wider ${
                          item.status === 'pending' ? 'bg-yellow-500' : item.status === 'validated' ? 'bg-blue-500' : 'bg-red-500'
                        }`}>{item.status}</span>
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => changePage("itemdetail", { itemId: item.id, fromPage: "dashboard", role: "encoder" })} className="text-[#800000] p-2 hover:bg-gray-100 rounded-lg transition"><Eye size={18}/></button>
                      </td>
                    </tr>
                  ))}
                  {submissionItems.length === 0 && <tr><td colSpan="5" className="p-10 text-center text-gray-400 italic">No submissions found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= RETURNED TAB ================= */}
        {tab === "returned" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fadeIn">
            {returnedItems.map(item => (
              <div key={item.id} className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col hover:shadow-xl transition-all h-full border border-red-100">
                <div className="h-48 overflow-hidden relative bg-gray-50">
                  {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" alt=""/> : <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>}
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] px-2 py-1 rounded font-bold uppercase">Returned</div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-[#800000] text-lg line-clamp-1">{item.title}</h3>
                  <div className="bg-red-50 p-3 rounded-xl text-[11px] text-red-700 my-3 border border-red-100 italic">
                    <span className="font-bold block not-italic mb-1 text-[10px]">Feedback:</span>
                    "{item.feedback || "Please check details for corrections."}"
                  </div>
                  <div className="mt-auto flex gap-2">
                    <button onClick={() => changePage("itemdetail", { itemId: item.id, fromPage: "dashboard", role: "encoder" })} className="flex-1 border-2 border-[#800000] text-[#800000] py-2 rounded-xl text-sm font-semibold hover:bg-[#800000] hover:text-white transition">View</button>
                    <button onClick={() => changePage("upload", { editItem: item })} className="flex-1 bg-[#D4A017] text-white py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1 hover:opacity-90 transition"><RotateCcw size={14}/> Edit</button>
                  </div>
                </div>
              </div>
            ))}
            {returnedItems.length === 0 && <p className="col-span-full text-center py-10 text-gray-400 italic">No returned items to show.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default EncoderDashboard;