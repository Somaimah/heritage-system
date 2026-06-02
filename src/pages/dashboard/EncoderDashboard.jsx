import React, { useEffect, useState, useMemo } from "react";
import { auth, db } from "../../firebase/firebase";
import { collection, query, onSnapshot, where, doc } from "firebase/firestore"; 
import {
  BookOpen, Upload, Archive, RotateCcw, Sparkles, Search, LayoutDashboard, ChevronLeft, ChevronRight, Quote, Clock, Edit3
} from "lucide-react";

import MasterDashboardShell from "../../components/MasterDashboardShell";
import WordOfTheDayConsole from "../../pages/dashboard/WordOfTheDayConsole";
import ConfirmationModal from "../../components/ConfirmationModal";

const EncoderDashboard = ({ user, changePage, triggerLogout }) => {
  const [items, setItems] = useState([]);
  const [proverbItems, setProverbItems] = useState([]); 
  const [tab, setTab] = useState(() => {
    return sessionStorage.getItem("encoder_active_tab") || "posted";
  });
  const [showWord, setShowWord] = useState(false); 
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [revisionType, setRevisionType] = useState(() => {
    return sessionStorage.getItem("encoder_revision_type") || "cultural";
  });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [todayWordData, setTodayWordData] = useState(null);

  const categories = ["all", "Artifact", "Historical Record", "Publication"];
  const [currentPage, setCurrentPage] = useState(1);
  
  const isProverbView = tab === "posted_proverbs" || (tab === "returned" && revisionType === "proverb");
  const itemsPerPage = isProverbView ? 10 : 25; 

  // ================= MODAL STATE =================
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    confirmText: "",
    onConfirm: () => {},
  });

  const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

  const requestWotdConfirm = (onConfirmCallback, isEdit = false) => {
    setConfirmConfig({
      isOpen: true,
      title: isEdit ? "Update Word of the Day" : "Publish Word of the Day",
      message: isEdit 
        ? "Are you sure you want to update today's Word? Changes will reflect immediately."
        : "Are you sure you want to publish this Word of the Day? It will be visible on the main dashboard immediately.",
      type: isEdit ? "warning" : "info",
      confirmText: isEdit ? "Update" : "Publish",
      onConfirm: () => {
        closeConfirm();
        if (onConfirmCallback) onConfirmCallback();
      }
    });
  };

  // ================= NOTIFICATION LISTENER =================
  useEffect(() => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) return;
    const q = query(collection(db, "notifications"));
    const unsub = onSnapshot(q, (snapshot) => {
      const unread = snapshot.docs.filter(doc => {
        const data = doc.data();
        const isMine = data.userId === uid;
        const matchesMyRole = (data.targetRoles || []).includes("encoder") || (data.targetRole || "").toLowerCase() === "encoder";
        const belongsToMe = isMine || matchesMyRole;
        const isUnread = data.userId ? (data.read !== true && data.read !== "true") : !(data.isReadBy || []).includes(uid);
        return belongsToMe && isUnread;
      });
      setUnreadNotifications(unread.length);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    sessionStorage.setItem("encoder_active_tab", tab);
  }, [tab]);
  
  useEffect(() => {
    sessionStorage.setItem("encoder_revision_type", revisionType);
  }, [revisionType]);
  
  // ================= DATA LOADERS =================
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "wordOfDay", "today"), (docSnap) => {
      if (docSnap.exists()) {
        setTodayWordData(docSnap.data());
      } else {
        setTodayWordData(null);
      }
    });
    return () => unsub();
  }, []);

  
  useEffect(() => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) return;
    const q = query(collection(db, "culturalItems")); 
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(
        snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter(item => !item.isDeleted) 
      );
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) return;
    const q = query(collection(db, "proverb"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(item => !item.isDeleted); 
      
      setProverbItems(list);
    });
    return () => unsub();
  }, [user]);

  // ================= STATS LOGIC =================
  const statsMetrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const uploadedToday = [...items, ...proverbItems].filter(i => {
      const createdAt = i.createdAt?.toDate ? i.createdAt.toDate() : null;
      return createdAt && createdAt >= startOfToday;
    }).length;

    const returnedItems = [...items, ...proverbItems].filter(i => i.status === "returned");
    let revisionItemName = "None";
    let daysPassedStr = "All Clear";
    
    if (returnedItems.length > 0) {
      const oldestReturned = returnedItems.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis() || a.createdAt?.toMillis() || 0;
        const timeB = b.updatedAt?.toMillis() || b.createdAt?.toMillis() || 0;
        return timeA - timeB;
      })[0];
      
      revisionItemName = oldestReturned.title || oldestReturned.proverb || "Untitled Item";
      
      const oldestDate = oldestReturned.updatedAt?.toDate() || oldestReturned.createdAt?.toDate();
      if (oldestDate) {
        const diffInMs = now - oldestDate;
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        daysPassedStr = diffInDays === 0 ? "Returned Today" : `${diffInDays} Day${diffInDays > 1 ? 's' : ''} Ago`;
      }
    }

    const totalPosted = [...items, ...proverbItems].filter(i => 
      ["posted", "published"].includes((i.status || "").toLowerCase()) 
    ).length;

    return { uploadedToday, revisionItemName, daysPassedStr, totalPosted, returnedCount: returnedItems.length };
  }, [items, proverbItems]);

  // ================= FILTERS & SEARCH (Metadata Integrated) =================
  
  const filteredCulturalItems = useMemo(() => {
    const queryLower = searchQuery.toLowerCase();
    return items.filter(item => {
      const matchesSearch = 
        (item.title || "").toLowerCase().includes(queryLower) ||
        (item.description || "").toLowerCase().includes(queryLower) ||
        (item.tags && Array.isArray(item.tags) && item.tags.some(tag => tag.toLowerCase().includes(queryLower)));
      const catMatch = selectedCategory === "all" || item.category === selectedCategory;
      return matchesSearch && catMatch;
    });
  }, [items, searchQuery, selectedCategory]);

  const filteredProverbItems = useMemo(() => {
    const queryLower = searchQuery.toLowerCase();
    return proverbItems.filter(item => 
      (item.proverb || "").toLowerCase().includes(queryLower) || 
      (item.meaning || "").toLowerCase().includes(queryLower) ||
      (item.tags && Array.isArray(item.tags) && item.tags.some(tag => tag.toLowerCase().includes(queryLower)))
    );
  }, [proverbItems, searchQuery]);

  // Item subsets for Tabs
const postedItems = useMemo(() => filteredCulturalItems.filter(i => i.status === "posted"), [filteredCulturalItems]); // 👈 REMOVED || i.status === "validated"
const submissionItems = useMemo(() => filteredCulturalItems.filter(i => ["pending", "validated", "returned", "posted"].includes(i.status)), [filteredCulturalItems]);
const returnedCulturalItems = useMemo(() => filteredCulturalItems.filter(i => i.status === "returned"), [filteredCulturalItems]);
const returnedProverbItems = useMemo(() => filteredProverbItems.filter(i => i.status === "returned"), [filteredProverbItems]);
const postedProverbs = useMemo(() => filteredProverbItems.filter(i => ["posted", "approved", "published"].includes((i.status || "").toLowerCase())), [filteredProverbItems]); 

  // ================= SIDEBAR LINKS (Static Counts) =================
const encoderLinks = useMemo(() => {
  const totalPostedItemsCount = items.filter(i => i.status === "posted").length; // 👈 REMOVED || i.status === "validated"
  const totalSubmissionsCount = items.filter(i => ["pending", "validated", "returned", "posted"].includes(i.status)).length;
  const totalPostedProverbsCount = proverbItems.filter(i => ["posted", "approved", "published"].includes((i.status || "").toLowerCase())).length; 
  const totalReturnedBaseCount = items.filter(i => i.status === "returned").length + proverbItems.filter(i => i.status === "returned").length;

    return [
      { value: "posted", label: "Cultural Archive", icon: <Archive size={16} />, badge: totalPostedItemsCount },
      { value: "submissions", label: "My Submissions", icon: <LayoutDashboard size={16} />, badge: totalSubmissionsCount },
      { value: "posted_proverbs", label: "Posted Proverbs", icon: <Quote size={16} />, badge: totalPostedProverbsCount },
      { value: "returned", label: "Needs Revision", icon: <RotateCcw size={16} />, badge: totalReturnedBaseCount > 0 ? totalReturnedBaseCount : undefined }
    ];
  }, [items, proverbItems]);

  // ================= PAGINATION LOGIC =================
  const currentTabItems = useMemo(() => {
    if (tab === "posted") return postedItems;
    if (tab === "submissions") return submissionItems;
    if (tab === "posted_proverbs") return postedProverbs;
    if (tab === "returned") return revisionType === "cultural" ? returnedCulturalItems : returnedProverbItems;
    return [];
  }, [tab, revisionType, postedItems, submissionItems, postedProverbs, returnedCulturalItems, returnedProverbItems]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return currentTabItems.slice(start, start + itemsPerPage);
  }, [currentTabItems, currentPage, itemsPerPage]);

  const renderPaginationSlider = (totalItems, perPage) => {
    const totalPages = Math.ceil(totalItems / perPage) || 1;
    if (totalItems <= perPage) return null;
    return (
      <div className="mt-12 pt-6 border-t border-[#E09F26]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} className="p-2.5 rounded-xl bg-white border border-[#E09F26]/30 text-[#4A0C16] disabled:opacity-40 hover:bg-gray-50 transition shadow-sm">
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-col items-center flex-1 max-w-[250px] w-full px-4">
          <span className="text-xs font-bold text-[#4A0C16] font-mono mb-2 uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
          <input type="range" min="1" max={totalPages} value={currentPage} onChange={(e) => setCurrentPage(Number(e.target.value))} className="w-full h-1.5 bg-[#E09F26]/30 rounded-lg appearance-none cursor-pointer accent-[#4A0C16]" />
        </div>
        <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} className="p-2.5 rounded-xl bg-white border border-[#E09F26]/30 text-[#4A0C16] disabled:opacity-40 hover:bg-gray-50 transition shadow-sm">
          <ChevronRight size={18} />
        </button>
      </div>
    );
  };

  return (
    <MasterDashboardShell
      userRole="encoder"
      userName={auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0]}
      activeTab={tab}
      setActiveTab={setTab}
      sidebarLinks={encoderLinks}
      notificationCount={unreadNotifications}
      onNotificationClick={() => changePage("notifications", { fromPage: "dashboard" })}
      onLogout={triggerLogout}
    >
      {/* 📊 METRIC OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-[#4A0C16] hover:bg-gray-50 transition-all duration-300">
          <p className="text-[#4A0C16] text-xs font-bold uppercase tracking-wider">Uploaded Today</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-black text-[#4A0C16] font-serif mt-1">{statsMetrics.uploadedToday}</h2>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Items created today</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-[#4A0C16] hover:bg-gray-50 transition-all duration-300 flex flex-col justify-center overflow-hidden">
          <p className="text-[#4A0C16] text-xs font-bold uppercase tracking-wider mb-1">Need to Revise</p>
          <h2 className={`font-black text-[#4A0C16] font-serif truncate mt-1 ${statsMetrics.returnedCount > 0 ? 'text-lg' : 'text-3xl'}`} title={statsMetrics.revisionItemName}>{statsMetrics.revisionItemName}</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <Clock size={10} className={statsMetrics.returnedCount > 0 ? "text-red-500" : "text-gray-400"} />
            <span className={`text-[10px] font-bold uppercase ${statsMetrics.returnedCount > 0 ? "text-red-600" : "text-gray-400"}`}>{statsMetrics.daysPassedStr}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-[#4A0C16] hover:bg-gray-50 transition-all duration-300">
          <p className="text-[#4A0C16] text-xs font-bold uppercase tracking-wider">Total Posted</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-black text-[#4A0C16] font-serif mt-1">{statsMetrics.totalPosted}</h2>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Live on platform</span>
          </div>
        </div>
      </div>

      <hr className="mb-4 border-t border-[#E09F26]/10" />

      {/* ⚡ ACTION BAR */}
      <div className="flex flex-wrap gap-3 mb-5">
        <button onClick={() => changePage("upload")} className="bg-[#4A0C16] text-white px-5 py-3 rounded-2xl flex items-center gap-2 text-xs font-bold hover:bg-[#31080E] transition shadow-sm border border-[#4A0C16]">
          <Upload size={14} /> Upload Cultural Item
        </button>
        <button onClick={() => changePage("uploadProverb")} className="bg-emerald-700 text-white px-5 py-3 rounded-2xl flex items-center gap-2 text-xs font-bold hover:bg-emerald-800 transition shadow-sm border border-emerald-700">
          <Quote size={14} /> Upload Proverb
        </button>
        <button onClick={() => setShowWord(!showWord)} className="bg-[#E09F26] text-[#4A0C16] px-5 py-3 rounded-2xl flex items-center gap-2 text-xs font-bold hover:bg-[#c98a1e] transition shadow-sm border border-[#E09F26]">
          {showWord ? <><Sparkles size={14} /> Close Console</> : todayWordData ? <><Edit3 size={14} /> Edit Word of the Day</> : <><Sparkles size={14} /> Set Word of the Day</>}
        </button>
      </div>

      {showWord && (
        <WordOfTheDayConsole 
          onClose={() => setShowWord(false)} 
          requestConfirm={requestWotdConfirm} 
          existingData={todayWordData}
        />
      )}

      <hr className="mb-6 border-t border-[#E09F26]/10" />

      {/* 🔍 SEARCH & FILTERS */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E09F26]" size={16} />
          <input type="text" placeholder="Search entries, descriptions, or metadata tags..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#E09F26]/20 focus:border-[#E09F26] outline-none bg-white text-sm transition-all" />
        </div>
        {tab !== "posted_proverbs" && tab !== "returned" && (
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-4 py-3 rounded-2xl border border-[#E09F26]/20 bg-white text-sm font-bold text-[#4A0C16] outline-none cursor-pointer">
            {categories.map(cat => <option key={cat} value={cat}>{cat === "all" ? "All Categories" : cat}</option>)}
          </select>
        )}
      </div>

      {tab === "returned" && (
        <div className="flex gap-2 mb-6 p-1 bg-gray-100/50 rounded-2xl w-fit border border-gray-100">
          {["cultural", "proverb"].map(type => (
            <button key={type} onClick={() => {setRevisionType(type); setCurrentPage(1);}} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${revisionType === type ? "bg-[#4A0C16] text-white shadow-md" : "text-gray-500 hover:text-[#4A0C16]"}`}>
              {type === "cultural" ? "Cultural Items" : "Proverbs"}
            </button>
          ))}
        </div>
      )}

      {/* 📊 GRID DISPLAY */}
      <div className="min-h-[400px]">
        {paginatedItems.length === 0 ? (
          <div className="bg-white/60 p-16 rounded-3xl text-center border border-[#E09F26]/15 text-gray-400 font-medium">No records found matching your current filter.</div>
        ) : (
          <div className={`grid gap-5 animate-fadeIn ${tab === "submissions" ? "grid-cols-1" : isProverbView ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"}`}>
            
            {(!isProverbView && tab !== "submissions") && paginatedItems.map(item => (
              <div key={item.id} className="bg-white rounded-3xl overflow-hidden border border-[#E09F26]/20 flex flex-col hover:border-[#E09F26]/50 transition-all group shadow-xs">
                <div className="h-36 relative bg-gray-50 border-b border-gray-100 overflow-hidden">
                  {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt=""/> : <div className="w-full h-full flex items-center justify-center text-gray-200"><BookOpen size={24}/></div>}
                  {item.status === "returned" && <div className="absolute top-2 left-2 bg-red-600 text-white text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-tighter">Returned</div>}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <span className="text-[8px] font-black uppercase text-[#E09F26] mb-1 tracking-widest">{item.category}</span>
                  <h3 className="font-bold text-[#4A0C16] text-sm line-clamp-2 font-serif mb-4 leading-tight">{item.title}</h3>
                  <button onClick={() => changePage("itemdetail", { itemId: item.id, fromPage: "dashboard", role: "encoder" })} className="w-full mt-auto bg-gray-50 text-[#4A0C16] py-2.5 rounded-xl text-[10px] font-bold hover:bg-[#4A0C16] hover:text-white transition-all border border-gray-100">
                    View
                  </button>
                </div>
              </div>
            ))}

            {isProverbView && paginatedItems.map(item => (
              <div key={item.id} onClick={() => changePage("proverbdetail", { itemId: item.id, role: "encoder", isPending: item.status === "pending_moderation" })} className="bg-white rounded-3xl flex flex-col shadow-xs border border-[#E09F26]/20 hover:border-[#E09F26]/80 hover:shadow-lg transition-all duration-300 h-[200px] p-6 cursor-pointer group relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[9px] bg-[#FEF9C3] text-[#A16207] px-2.5 py-1 rounded-lg border border-[#FEF08A] font-black uppercase tracking-widest">{item.category || "Proverb"}</span>
                  {item.status === "returned" && <span className="text-[8px] bg-red-600 text-white px-2 py-0.5 rounded font-black tracking-widest uppercase">REVISION</span>}
                </div>
                <div className="flex gap-4 items-start flex-1 overflow-hidden">
                  <Quote size={24} className="text-[#E09F26] mt-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                  <div className="flex flex-col gap-1.5 w-full min-w-0">
                    <h3 className="text-lg font-black text-[#4A0C16] italic font-serif line-clamp-2 leading-tight">"{item.proverb}"</h3>
                    <p className="text-[11px] text-gray-500 line-clamp-2 font-medium leading-relaxed">{item.meaning}</p>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-gray-50 flex justify-end">
                   <span className="text-[9px] font-black text-[#E09F26] uppercase tracking-widest group-hover:text-[#4A0C16] transition-colors">Open Profile &rarr;</span>
                </div>
              </div>
            ))}

            {tab === "submissions" && (
              <div className="bg-white rounded-3xl border border-[#E09F26]/20 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-[#4A0C16] text-[#E09F26] text-[9px] font-black uppercase tracking-widest">
                    <tr><th className="p-5 pl-8">Resource Title</th><th className="p-5">Registry Status</th></tr>
                  </thead>
                  <tbody className="text-xs">
                    {paginatedItems.map(item => (
                      <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="p-5 pl-8 font-bold text-[#4A0C16] font-serif text-sm">{item.title || item.proverb}</td>
                        <td className="p-5">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            item.status === 'returned' ? 'bg-red-50 text-red-600 border-red-100' : 
                            item.status === 'posted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-[#FEF9C3] text-[#A16207] border-[#FEF08A]'
                          }`}>{item.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {renderPaginationSlider(currentTabItems.length, itemsPerPage)}

      <ConfirmationModal 
        isOpen={confirmConfig.isOpen} 
        config={confirmConfig} 
        onClose={closeConfirm} 
      />
    </MasterDashboardShell>
  );
};

export default EncoderDashboard;