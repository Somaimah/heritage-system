import React, { useEffect, useState, useMemo } from "react";
import { auth, db } from "../../firebase/firebase";
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc,
  query,
  where,
  or
} from "firebase/firestore";
import { 
  Archive, Search, ChevronLeft, ChevronRight, Inbox, 
  BookOpen, Clock, MessageSquare, ShieldCheck, Quote, Filter
} from "lucide-react";

import { useToast } from "../../components/ToastContext";
import MasterDashboardShell from "../../components/MasterDashboardShell";
import ConfirmationModal from "../../components/ConfirmationModal"; // 🆕 Imported Confirmation Modal

const ModeratorDashboard = ({ changePage, triggerLogout }) => {
  const { showToast } = useToast(); 

  const [tab, setTab] = useState("cultural_validation");
  const [culturalItems, setCulturalItems] = useState([]);
  const [proverbItems, setProverbItems] = useState([]); 
  const [systemFeedbackList, setSystemFeedbackList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0); 
  const [brokenImages, setBrokenImages] = useState({});

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const isProverbView = tab === "published_proverbs" || tab === "proverb_validation";
  
  const itemsPerPage = isProverbView ? 10 : 15; 

  const categoriesList = ["All", "Wisdom", "Relationships & Community", "Honor & Respect", "General Life Lessons"];

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

  // 1. Logout Confirmation Handler
  const handleLogoutClick = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Confirm Logout",
      message: "Are you sure you want to log out of your session?",
      type: "warning",
      confirmText: "Log Out",
      onConfirm: () => {
        closeConfirm();
        triggerLogout();
      }
    });
  };

  // ================= DATA STREAM CHANNELS =================
  useEffect(() => {
    const q = query(collection(db, "culturalItems"), where("status", "in", ["pending", "uploaded", "returned", "posted", "approved", "deleted", "validated"]));
    const unsub = onSnapshot(q, (snapshot) => setCulturalItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))), (err) => showToast(err.message, "error"));
    return () => unsub();
  }, [showToast]);

  useEffect(() => {
    const q = query(collection(db, "proverb"), where("status", "in", ["pending_moderation", "pending", "uploaded", "submitted", "posted", "published", "validated", "approved", "returned", "deleted"]));
    const unsub = onSnapshot(q, (snapshot) => setProverbItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))), (err) => showToast(err.message, "error"));
    return () => unsub();
  }, [showToast]);

  useEffect(() => {
    const q = query(collection(db, "systemFeedbacks"));
    const unsub = onSnapshot(q, (snapshot) => setSystemFeedbackList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))), (err) => showToast(err.message, "error"));
    return () => unsub();
  }, [showToast]);

  useEffect(() => {
    let unsubSnap = null;
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (unsubSnap) { unsubSnap(); unsubSnap = null; }
      if (!user) { setUnreadCount(0); return; }
      const q = query(collection(db, "notifications"), or(where("userId", "==", user.uid), where("targetRole", "==", "moderator")));
      unsubSnap = onSnapshot(q, (snapshot) => {
        const unreadItems = snapshot.docs.filter(doc => {
          const data = doc.data();
          if (data.userId) return data.read !== true && data.read !== "true";
          return !(Array.isArray(data.isReadBy) ? data.isReadBy : []).includes(user.uid);
        });
        setUnreadCount(unreadItems.length);
      });
    });
    return () => { unsubscribeAuth(); if (unsubSnap) unsubSnap(); };
  }, []);

  // ================= METRICS AGGREGATION =================
  const metrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const proverbsToday = proverbItems.filter(i => {
      let updateTime = 0;
      if (i.updatedAt?.toMillis) updateTime = i.updatedAt.toMillis();
      else if (i.updatedAt?.seconds) updateTime = i.updatedAt.seconds * 1000;
      else if (typeof i.updatedAt === 'number') updateTime = i.updatedAt;
      else if (typeof i.updatedAt === 'string') updateTime = new Date(i.updatedAt).getTime();
      return updateTime >= startOfToday && ["posted", "published"].includes(i.status);
    }).length;

    const validatedToday = [...culturalItems, ...proverbItems].filter(i => {
      let updateTime = 0;
      if (i.updatedAt?.toMillis) updateTime = i.updatedAt.toMillis();
      else if (i.updatedAt?.seconds) updateTime = i.updatedAt.seconds * 1000;
      else if (typeof i.updatedAt === 'number') updateTime = i.updatedAt;
      else if (typeof i.updatedAt === 'string') updateTime = new Date(i.updatedAt).getTime();
      
      const stat = (i.status || "").toLowerCase();
      return updateTime >= startOfToday && ["validated", "posted", "approved", "published"].includes(stat);
    }).length;

    const pendingItems = [
      ...culturalItems.filter(i => ["pending", "uploaded"].includes(i.status)),
      ...proverbItems.filter(i => ["pending_moderation", "pending", "submitted"].includes(i.status))
    ];

    let oldestItemName = "None";
    let daysPassedStr = "All Clear";
    let pendingCount = pendingItems.length;

    if (pendingCount > 0) {
      const oldest = pendingItems.sort((a, b) => {
        let timeA = 0; let timeB = 0;
        if (a.createdAt?.toMillis) timeA = a.createdAt.toMillis();
        else if (typeof a.createdAt === 'string') timeA = new Date(a.createdAt).getTime();
        
        if (b.createdAt?.toMillis) timeB = b.createdAt.toMillis();
        else if (typeof b.createdAt === 'string') timeB = new Date(b.createdAt).getTime();

        return timeA - timeB;
      })[0];

      oldestItemName = oldest.title || oldest.proverb || "Untitled Item";
      
      let oldestDate = null;
      if (oldest.createdAt?.toDate) oldestDate = oldest.createdAt.toDate();
      else if (typeof oldest.createdAt === 'string') oldestDate = new Date(oldest.createdAt);
      else if (typeof oldest.createdAt === 'number') oldestDate = new Date(oldest.createdAt);

      if (oldestDate) {
        const diffInMs = now.getTime() - oldestDate.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        daysPassedStr = diffInDays === 0 ? "Submitted Today" : `${diffInDays} Day${diffInDays > 1 ? 's' : ''}`;
      }
    }

    return { 
      proverbsToday, 
      validatedToday, 
      oldestItemName, 
      daysPassedStr, 
      pendingCount,
      culturalPendingCount: culturalItems.filter(i => ["pending", "uploaded"].includes(i.status)).length,
      proverbPendingCount: proverbItems.filter(i => ["pending_moderation", "pending"].includes(i.status)).length,
      cultPosted: culturalItems.filter(i => ["posted", "approved"].includes(i.status)),
      provPosted: proverbItems.filter(i => ["posted", "published", "validated", "approved"].includes(i.status))
    };
  }, [culturalItems, proverbItems]);

  const uniqueCategories = useMemo(() => ["all", ...new Set(culturalItems.map(item => item.category).filter(Boolean))], [culturalItems]);

  // ================= FILTER ENGINE =================
  const filteredActiveItems = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    let baseList = [];

    if (tab === "cultural_validation") baseList = culturalItems.filter(i => ["pending", "uploaded"].includes((i.status || "").toLowerCase()));
    else if (tab === "proverb_validation") baseList = proverbItems.filter(i => ["pending_moderation", "pending", "uploaded", "submitted"].includes((i.status || "").toLowerCase()));
    else if (tab === "published_proverbs") baseList = metrics.provPosted;
    else if (tab === "archive") baseList = metrics.cultPosted;
    else if (tab === "feedbacks") return systemFeedbackList;

    return baseList.filter(item => {
      if (tab === "published_proverbs") {
        const itemCategory = item.category || "General Life Lessons";
        return (selectedCategory === "all" || selectedCategory === "All" || itemCategory === selectedCategory) &&
          (!normalizedQuery || (item.proverb || "").toLowerCase().includes(normalizedQuery) || (item.meaning || "").toLowerCase().includes(normalizedQuery));
      }
      return (!normalizedQuery || (item.title || "").toLowerCase().includes(normalizedQuery) || (item.proverb || "").toLowerCase().includes(normalizedQuery)) &&
        (tab === "proverb_validation" || selectedCategory === "all" || item.category === selectedCategory);
    });
  }, [tab, culturalItems, proverbItems, metrics, searchQuery, selectedCategory, systemFeedbackList]);

  useEffect(() => { setCurrentPage(1); }, [tab, searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredActiveItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => filteredActiveItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredActiveItems, currentPage, itemsPerPage]);

  // 🔄 Updated Feedback Toggle Handler with Confirmation
  const handleToggleFeedbackStatus = (feedbackId, currentStatus) => {
    const newStatus = currentStatus === "resolved" ? "pending" : "resolved";
    const actionText = newStatus === "resolved" ? "Resolve" : "Unresolve";
    
    setConfirmConfig({
      isOpen: true,
      title: `${actionText} Feedback`,
      message: newStatus === "resolved" 
        ? "Are you sure you want to mark this feedback as resolved?"
        : "Are you sure you want to move this feedback back to pending?",
      type: newStatus === "resolved" ? "success" : "warning",
      confirmText: `Yes, ${actionText}`,
      onConfirm: async () => {
        closeConfirm();
        try {
          await updateDoc(doc(db, "systemFeedbacks", feedbackId), { status: newStatus });
          showToast(`Feedback status marked as ${newStatus}.`, "success");
        } catch (err) { 
          showToast(err.message, "error"); 
        }
      }
    });
  };

  const moderatorLinks = [
    { value: "cultural_validation", label: "Pending Cultural Items", icon: <ShieldCheck size={16} />, badge: metrics.culturalPendingCount > 0 ? metrics.culturalPendingCount : undefined },
    { value: "proverb_validation", label: "Pending Proverbs", icon: <Clock size={16} />, badge: metrics.proverbPendingCount > 0 ? metrics.proverbPendingCount : undefined },
    { value: "published_proverbs", label: "Posted Proverbs", icon: <Quote size={16} />, badge: metrics.provPosted.length > 0 ? metrics.provPosted.length : undefined },
    { value: "archive", label: "Cultural Archive", icon: <Archive size={16} />, badge: metrics.cultPosted.length },
    { value: "feedbacks", label: "System Feedbacks", icon: <MessageSquare size={16} />, badge: systemFeedbackList.length > 0 ? systemFeedbackList.length : undefined }
  ];

  return (
    <MasterDashboardShell 
      userRole="moderator" 
      userName={auth.currentUser?.displayName || (auth.currentUser?.email || "").split("@")[0]} 
      activeTab={tab} 
      setActiveTab={setTab} 
      sidebarLinks={moderatorLinks} 
      notificationCount={unreadCount} 
      onNotificationClick={() => changePage("notifications", { fromPage: "dashboard" })} 
      onLogout={handleLogoutClick} // 🔄 Updated to use modal
    >
      
      {/* 📊 MAROON STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-[#4A0C16] hover:bg-gray-50 transition-all duration-300">
          <p className="text-[#4A0C16] text-xs font-bold uppercase tracking-wider">Proverbs Today</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-black text-[#4A0C16] font-serif mt-1">{metrics.proverbsToday}</h2>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Posted Today</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-[#4A0C16] hover:bg-gray-50 transition-all duration-300">
          <p className="text-[#4A0C16] text-xs font-bold uppercase tracking-wider">Validated Today</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-black text-[#4A0C16] font-serif mt-1">{metrics.validatedToday}</h2>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Items reviewed</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-[#4A0C16] hover:bg-gray-50 transition-all duration-300 flex flex-col justify-center overflow-hidden">
          <p className="text-[#4A0C16] text-xs font-bold uppercase tracking-wider mb-1">Need to Validate</p>
          <h2 className={`font-black text-[#4A0C16] font-serif truncate mt-1 ${metrics.pendingCount > 0 ? 'text-lg' : 'text-3xl'}`} title={metrics.oldestItemName}>
            {metrics.oldestItemName}
          </h2>
          <div className="flex items-center gap-1.5 mt-1">
            <Clock size={10} className={metrics.pendingCount > 0 ? "text-red-500" : "text-gray-400"} />
            <span className={`text-[10px] font-bold uppercase ${metrics.pendingCount > 0 ? "text-red-600" : "text-gray-400"}`}>
              {metrics.daysPassedStr}
            </span>
          </div>
        </div>
      </div>

      <hr className="my-8 border-t border-[#E09F26]/20 w-full" />

      {/* 🔍 CONTROL CONTROLLERS */}
      {tab !== "feedbacks" && (
        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder={isProverbView ? "Search traditional wisdom..." : "Search entries..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-[#E09F26]/20 focus:outline-none focus:border-[#E09F26] text-sm font-medium text-[#4A0C16] bg-white shadow-sm transition-all" />
          </div>
          {tab !== "proverb_validation" && (
            <div className="relative min-w-[240px]">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E09F26]" size={16} />
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-[#E09F26]/20 bg-white cursor-pointer text-sm font-bold text-[#4A0C16] appearance-none shadow-sm transition-all">
                {isProverbView ? categoriesList.map(cat => <option key={cat} value={cat}>{cat === "All" ? "All Proverb Kinds" : cat}</option>) : uniqueCategories.map(cat => <option key={cat} value={cat}>{cat === "all" ? "All Categories" : cat}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* 📊 GRID DISPLAY */}
      <div className="min-h-[400px]">
        {paginatedItems.length === 0 ? (
          <div className="bg-white/60 p-16 rounded-3xl text-center border border-[#E09F26]/15 flex flex-col items-center justify-center">
            <Inbox className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm font-medium">No records found within this category.</p>
          </div>
        ) : (
          <div className={`grid gap-5 animate-fadeIn ${
            isProverbView ? "grid-cols-1 lg:grid-cols-2" : 
            tab === "feedbacks" ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : 
            "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:!grid-cols-5"
          }`}>
            
            {/* CULTURAL CARDS */}
            {(tab === "cultural_validation" || tab === "archive") && paginatedItems.map(item => (
              <div key={item.id} onClick={() => changePage("itemdetail", { itemId: item.id, fromPage: "dashboard", role: "moderator", isPending: tab === "cultural_validation" })} className="bg-white rounded-3xl overflow-hidden border border-[#E09F26]/20 flex flex-col hover:border-[#E09F26]/50 hover:shadow-lg cursor-pointer transition-all group">
                <div className="h-36 relative bg-gray-50 border-b">
                  {item.imageUrl && !brokenImages[item.id] ? (
                    <img src={item.imageUrl} onError={() => setBrokenImages(prev => ({ ...prev, [item.id]: true }))} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt=""/> 
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200"><BookOpen size={24}/></div>
                  )}
                  {tab === "cultural_validation" && <div className="absolute top-2 left-2 bg-amber-500 text-white text-[8px] px-2 py-0.5 rounded font-black uppercase">Pending Review</div>}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <span className="text-[8px] font-black uppercase text-[#E09F26] mb-1">{item.category}</span>
                  <h3 className="font-bold text-[#4A0C16] text-sm line-clamp-2 font-serif mb-3 leading-tight">{item.title}</h3>
                  <div className="mt-auto pt-3 border-t border-gray-50 text-right">
                     <span className="text-[10px] font-bold text-[#E09F26] uppercase group-hover:text-[#4A0C16]">{tab === "archive" ? "View →" : "Details →"}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* PROVERB CARDS */}
            {(isProverbView) && paginatedItems.map(item => (
              <div key={item.id} onClick={() => changePage("proverbdetail", { itemId: item.id, fromPage: "dashboard", role: "moderator", isPending: tab === "proverb_validation" })} className="bg-white rounded-2xl flex flex-col border border-[#E09F26]/20 hover:border-[#E09F26]/80 hover:shadow-lg transition-all h-[220px] p-6 cursor-pointer group relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] bg-[#FEF9C3] text-[#A16207] px-2.5 py-1 rounded border border-[#FEF08A] font-black uppercase tracking-widest">{item.category}</span>
                  {tab === "proverb_validation" && <span className="text-[8px] bg-amber-500 text-white px-2 py-0.5 rounded font-black">PENDING</span>}
                </div>
                <div className="flex gap-4 items-start flex-1 overflow-hidden">
                  <Quote size={28} className="text-[#E09F26] opacity-40 group-hover:opacity-100 transition-opacity" />
                  <div className="flex flex-col gap-2 w-full">
                    <h3 className="text-xl font-black text-[#4A0C16] italic font-serif line-clamp-2 leading-snug">"{item.proverb}"</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 font-medium">{item.meaning}</p>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-gray-50 text-right">
                   <span className="text-[10px] font-bold text-[#E09F26] uppercase">Review &rarr;</span>
                </div>
              </div>
            ))}

            {/* FEEDBACKS */}
            {tab === "feedbacks" && paginatedItems.map(fb => (
              <div key={fb.id} className="bg-white rounded-2xl flex flex-col shadow-xs border border-[#E09F26]/20 p-4 h-48">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-[10px] font-bold text-[#4A0C16] truncate pr-2">{fb.userEmail}</h4>
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${fb.status === 'resolved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{fb.status}</span>
                </div>
                <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-100 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  <p className="text-gray-600 text-[11px] italic pr-1">"{fb.message}"</p>
                </div>
                <button 
                  onClick={() => handleToggleFeedbackStatus(fb.id, fb.status)} 
                  className={`w-full mt-3 py-2 rounded-xl text-[10px] font-bold transition-colors ${
                    fb.status === "resolved" 
                    ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                    : "bg-[#4A0C16] text-white hover:bg-[#31080E]"
                  }`}
                >
                  {fb.status === "resolved" ? 'Resolved ✓' : 'Resolve'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔢 SLIDING RANGE PAGINATION */}
      {totalPages > 1 && (
        <div className="mt-10 pt-6 border-t border-[#E09F26]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400 font-medium">
            Showing <span className="font-bold text-[#4A0C16]">{Math.min(currentPage * itemsPerPage, filteredActiveItems.length)}</span> of <span className="font-bold text-[#4A0C16]">{filteredActiveItems.length}</span>
          </p>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
            <button 
              disabled={currentPage <= 1} 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
              className="p-2.5 rounded-xl bg-white border border-[#E09F26]/30 text-[#4A0C16] disabled:opacity-40 hover:bg-gray-50 transition shadow-sm"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex flex-col items-center flex-1 max-w-[250px] w-full px-4">
              <span className="text-xs font-bold text-[#4A0C16] font-mono mb-2 uppercase tracking-widest">
                Page {currentPage} of {totalPages}
              </span>
              <input 
                type="range" 
                min="1" 
                max={totalPages} 
                value={currentPage} 
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                className="w-full h-1.5 bg-[#E09F26]/30 rounded-lg appearance-none cursor-pointer accent-[#4A0C16]"
                title="Slide to change pages"
              />
            </div>

            <button 
              disabled={currentPage >= totalPages} 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
              className="p-2.5 rounded-xl bg-white border border-[#E09F26]/30 text-[#4A0C16] disabled:opacity-40 hover:bg-gray-50 transition shadow-sm"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 🔐 UNIVERSAL CONFIRMATION MODAL */}
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen} 
        config={confirmConfig} 
        onClose={closeConfirm} 
      />

    </MasterDashboardShell>
  );
};

export default ModeratorDashboard;