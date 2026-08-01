import React, { useEffect, useState, useMemo } from "react";
import { auth, db } from "../../firebase/firebase";
import { 
  doc, 
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { 
  Archive, Search, ChevronLeft, ChevronRight, Inbox, 
  BookOpen, Clock, MessageSquare, ShieldCheck, Quote, Filter,
  Star, Trash2, RotateCcw
} from "lucide-react";

import { useToast } from "../../contexts/ToastContext";
import MasterDashboardShell from "../../components/MasterDashboardShell";
import ConfirmationModal from "../../components/ConfirmationModal";

// Import the centralized data hook
import { useSystemData } from "../../hooks/useSystemData"; 

const ModeratorDashboard = ({ changePage, triggerLogout }) => {
  const { showToast } = useToast(); 

  const [tab, setTab] = useState(() => {
    return sessionStorage.getItem("moderatorTab") || "cultural_validation";
  });

  useEffect(() => {
    sessionStorage.setItem("moderatorTab", tab);
  }, [tab]);
  
  const [brokenImages, setBrokenImages] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const isProverbView = tab === "published_proverbs" || tab === "proverb_validation";
  const itemsPerPage = isProverbView ? 10 : 15; 

  const categoriesList = ["All", "Wisdom", "Relationships & Community", "Honor & Respect", "General Life Lessons"];

  // ================= MODAL STATE (Used for Feedbacks & Actions) =================
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    confirmText: "",
    onConfirm: () => {},
  });

  const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

  // ================= CENTRALIZED DATA STREAM =================
  const { 
    culturalItems = [], 
    proverbItems = [], 
    systemFeedbacks: systemFeedbackList = [],
    notifications = []
  } = useSystemData("moderator");

  // Count active non-deleted system feedbacks for sidebar badge
  const activeFeedbacksCount = useMemo(() => {
    return systemFeedbackList.filter(fb => !fb.isDeleted && fb.status !== "deleted").length;
  }, [systemFeedbackList]);

  // Process notifications locally for the unread count
  const unreadCount = useMemo(() => {
    const user = auth.currentUser;
    if (!user) return 0;

    const unreadItems = notifications.filter(notif => {
      const isTarget = notif.userId === user.uid || notif.targetRole === "moderator";
      if (!isTarget) return false;

      if (notif.userId) return notif.read !== true && notif.read !== "true";
      return !(Array.isArray(notif.isReadBy) ? notif.isReadBy : []).includes(user.uid);
    });

    return unreadItems.length;
  }, [notifications]);

  // ================= METRICS AGGREGATION =================
  const metrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const proverbsToday = proverbItems.filter(i => {
      let updateTime = 0;
      if (i.updatedAt?.toMillis) updateTime = i.updatedAt.toMillis();
      else if (i.updatedAt?.seconds) updateTime = i.updatedAt.seconds * 1000;
      return updateTime >= startOfToday && ["posted", "published"].includes(i.status);
    }).length;

    const validatedToday = [...culturalItems, ...proverbItems].filter(i => {
      let updateTime = 0;
      if (i.updatedAt?.toMillis) updateTime = i.updatedAt.toMillis();
      else if (i.updatedAt?.seconds) updateTime = i.updatedAt.seconds * 1000;
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
      const oldest = pendingItems.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0))[0];
      oldestItemName = oldest.title || oldest.proverb || "Untitled Item";
      let oldestDate = oldest.createdAt?.toDate ? oldest.createdAt.toDate() : null;
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
      culturalPendingCount: culturalItems.filter(i => ["pending", "uploaded"].includes(i.status) && !i.isDeleted).length,
      proverbPendingCount: proverbItems.filter(i => ["pending_moderation", "pending"].includes(i.status) && !i.isDeleted).length,
      cultPosted: culturalItems.filter(i => ["posted", "approved"].includes(i.status) && !i.isDeleted),
      provPosted: proverbItems.filter(i => ["posted", "published", "validated", "approved"].includes((i.status || "").toLowerCase()) && !i.isDeleted)
    };
  }, [culturalItems, proverbItems]);

  const uniqueCategories = useMemo(() => ["all", ...new Set(culturalItems.map(item => item.category).filter(Boolean))], [culturalItems]);

  // ================= IMPROVED FILTER & SORT ENGINE =================
  const filteredActiveItems = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim();

    // 1. ENTERPRISE FEEDBACK SORTING (Filterable by Active/Status/Trash + Search)
    if (tab === "feedbacks") {
      return [...systemFeedbackList]
        .filter(fb => {
          const fbStatus = (fb.status || "pending").toLowerCase();
          const isItemDeleted = fb.isDeleted === true || fbStatus === "deleted";

          // Trash view: Only show soft-deleted feedback
          if (feedbackStatusFilter === "deleted") {
            if (!isItemDeleted) return false;
          } else {
            // Standard views: Exclude soft-deleted feedback
            if (isItemDeleted) return false;

            // Filter active feedback by pending/resolved status
            if (feedbackStatusFilter !== "all" && fbStatus !== feedbackStatusFilter.toLowerCase()) {
              return false;
            }
          }

          // Search query check
          const matchesSearch = !normalizedQuery || (
            (fb.message || "").toLowerCase().includes(normalizedQuery) ||
            (fb.userEmail || "").toLowerCase().includes(normalizedQuery) ||
            (fb.userName || "").toLowerCase().includes(normalizedQuery) ||
            (fb.feedbackType || "").toLowerCase().includes(normalizedQuery)
          );

          return matchesSearch;
        })
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
          return timeB - timeA; // Newest on top
        });
    }

    // 2. CULTURAL & PROVERB ITEM FILTERING
    let baseList = [];
    if (tab === "cultural_validation") baseList = culturalItems.filter(i => ["pending", "uploaded"].includes((i.status || "").toLowerCase()));
    else if (tab === "proverb_validation") baseList = proverbItems.filter(i => ["pending_moderation", "pending", "uploaded", "submitted"].includes((i.status || "").toLowerCase()));
    else if (tab === "published_proverbs") baseList = metrics.provPosted;
    else if (tab === "archive") baseList = metrics.cultPosted;

    return baseList.filter(item => {
      const hasTagMatch = Array.isArray(item.tags) && item.tags.some(tag => tag.toLowerCase().includes(normalizedQuery));
      
      const matchesSearch = !normalizedQuery || 
        (item.title || "").toLowerCase().includes(normalizedQuery) ||
        (item.proverb || "").toLowerCase().includes(normalizedQuery) ||
        (item.meaning || "").toLowerCase().includes(normalizedQuery) ||
        (item.description || "").toLowerCase().includes(normalizedQuery) ||
        hasTagMatch;

      const itemCategory = item.category || (isProverbView ? "General Life Lessons" : "Uncategorized");
      const matchesCategory = 
        selectedCategory.toLowerCase() === "all" || 
        itemCategory === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [tab, culturalItems, proverbItems, metrics, searchQuery, selectedCategory, feedbackStatusFilter, systemFeedbackList, isProverbView]);

  useEffect(() => { setCurrentPage(1); }, [tab, searchQuery, selectedCategory, feedbackStatusFilter]);

  const totalPages = Math.ceil(filteredActiveItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => filteredActiveItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredActiveItems, currentPage, itemsPerPage]);

  // ================= FEEDBACK ACTION HANDLERS =================

  // Toggle Pending <-> Resolved
  const handleToggleFeedbackStatus = (feedbackId, currentStatus) => {
    const newStatus = currentStatus === "resolved" ? "pending" : "resolved";
    const actionText = newStatus === "resolved" ? "Resolve" : "Unresolve";
    
    setConfirmConfig({
      isOpen: true,
      title: `${actionText} Feedback`,
      message: newStatus === "resolved" ? "Are you sure you want to mark this feedback as resolved?" : "Are you sure you want to move this feedback back to pending?",
      type: newStatus === "resolved" ? "success" : "warning",
      confirmText: `Yes, ${actionText}`,
      onConfirm: async () => {
        closeConfirm();
        try {
          await updateDoc(doc(db, "systemFeedbacks", feedbackId), { status: newStatus });
          showToast(`Feedback status marked as ${newStatus}.`, "success");
        } catch (err) { showToast(err.message, "error"); }
      }
    });
  };

  // Step 1: Soft Delete (Move to Trash filter)
  const handleSoftDeleteFeedback = (feedbackId) => {
    setConfirmConfig({
      isOpen: true,
      title: "Move to Trash",
      message: "This feedback will be moved to the Trash view. You can restore it or permanently delete it later.",
      type: "warning",
      confirmText: "Move to Trash",
      onConfirm: async () => {
        closeConfirm();
        try {
          await updateDoc(doc(db, "systemFeedbacks", feedbackId), { 
            isDeleted: true,
            status: "deleted" 
          });
          showToast("Feedback moved to Trash.", "info");
        } catch (err) { showToast(err.message, "error"); }
      }
    });
  };

  // Step 2a: Restore from Trash
  const handleRestoreFeedback = (feedbackId) => {
    setConfirmConfig({
      isOpen: true,
      title: "Restore Feedback",
      message: "Are you sure you want to restore this feedback back to active status?",
      type: "success",
      confirmText: "Yes, Restore",
      onConfirm: async () => {
        closeConfirm();
        try {
          await updateDoc(doc(db, "systemFeedbacks", feedbackId), { 
            isDeleted: false,
            status: "pending" 
          });
          showToast("Feedback restored successfully.", "success");
        } catch (err) { showToast(err.message, "error"); }
      }
    });
  };

  // Step 2b: Hard Delete Forever (Permanent Removal)
  const handleHardDeleteFeedback = (feedbackId) => {
    setConfirmConfig({
      isOpen: true,
      title: "Permanently Delete Feedback",
      message: "This action CANNOT be undone. This feedback will be permanently removed from the database.",
      type: "danger",
      confirmText: "Delete Permanently",
      onConfirm: async () => {
        closeConfirm();
        try {
          await deleteDoc(doc(db, "systemFeedbacks", feedbackId));
          showToast("Feedback permanently deleted.", "success");
        } catch (err) { showToast(err.message, "error"); }
      }
    });
  };

  const moderatorLinks = [
    { value: "cultural_validation", label: "Pending Cultural Items", icon: <ShieldCheck size={16} />, badge: metrics.culturalPendingCount > 0 ? metrics.culturalPendingCount : undefined },
    { value: "proverb_validation", label: "Pending Proverbs", icon: <Clock size={16} />, badge: metrics.proverbPendingCount > 0 ? metrics.proverbPendingCount : undefined },
    { value: "published_proverbs", label: "Posted Proverbs", icon: <Quote size={16} />, badge: metrics.provPosted.length > 0 ? metrics.provPosted.length : undefined },
    { value: "archive", label: "Cultural Archive", icon: <Archive size={16} />, badge: metrics.cultPosted.length },
    { value: "feedbacks", label: "System Feedbacks", icon: <MessageSquare size={16} />, badge: activeFeedbacksCount > 0 ? activeFeedbacksCount : undefined }
  ];

  return (
    <MasterDashboardShell 
      userRole="moderator" 
      userName={auth.currentUser?.displayName || (auth.currentUser?.email || "").split("@")[0]} 
      userPhoto={auth.currentUser?.photoURL}
      activeTab={tab} 
      setActiveTab={setTab} 
      sidebarLinks={moderatorLinks} 
      notificationCount={unreadCount} 
      onNotificationClick={() => changePage("notifications", { fromPage: "dashboard" })} 
      onLogout={triggerLogout} 
    >
      
      {/* 📊 STAT CARDS & DIVIDER - Only rendered on Pending tabs */}
      {(tab === "cultural_validation" || tab === "proverb_validation") && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            <div className="bg-white p-5 rounded-3xl shadow-xs border border-[#4A0C16] hover:bg-gray-50 transition-all duration-300">
              <p className="text-[#4A0C16] text-xs font-bold uppercase tracking-wider">Proverbs Today</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-black text-[#4A0C16] font-serif mt-1">{metrics.proverbsToday}</h2>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Posted Today</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-xs border border-[#4A0C16] hover:bg-gray-50 transition-all duration-300">
              <p className="text-[#4A0C16] text-xs font-bold uppercase tracking-wider">Validated Today</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-black text-[#4A0C16] font-serif mt-1">{metrics.validatedToday}</h2>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Items reviewed</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-xs border border-[#4A0C16] hover:bg-gray-50 transition-all duration-300 flex flex-col justify-center overflow-hidden">
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

          <hr className="my-5 border-t border-[#E09F26]/20 w-full" />
        </>
      )}

      {/* 🔍 SEARCH & FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-4 mb-5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder={
              tab === "feedbacks" 
                ? "Search feedback messages, emails, or tags..." 
                : isProverbView 
                  ? "Search wisdom or metadata tags..." 
                  : "Search entries or metadata tags..."
            } 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-[#E09F26]/20 focus:outline-none focus:border-[#E09F26] text-sm font-medium text-[#4A0C16] bg-white shadow-xs transition-all" 
          />
        </div>

        {tab === "feedbacks" ? (
          <div className="relative min-w-[240px]">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E09F26]" size={16} />
            <select 
              value={feedbackStatusFilter} 
              onChange={(e) => setFeedbackStatusFilter(e.target.value)} 
              className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-[#E09F26]/20 bg-white cursor-pointer text-sm font-bold text-[#4A0C16] appearance-none shadow-xs transition-all"
            >
              <option value="all">All Active Feedback</option>
              <option value="pending">⏳ Pending Only</option>
              <option value="resolved">✓ Resolved Only</option>
              <option value="deleted">🗑️ Deleted / Trash</option>
            </select>
          </div>
        ) : (
          <div className="relative min-w-[240px]">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E09F26]" size={16} />
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)} 
              className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-[#E09F26]/20 bg-white cursor-pointer text-sm font-bold text-[#4A0C16] appearance-none shadow-xs transition-all"
            >
              {isProverbView 
                ? categoriesList.map(cat => <option key={cat} value={cat}>{cat === "All" ? "All Proverb Kinds" : cat}</option>) 
                : uniqueCategories.map(cat => <option key={cat} value={cat}>{cat === "all" ? "All Categories" : cat}</option>)
              }
            </select>
          </div>
        )}
      </div>

      {/* CONTENT GRID */}
      <div className="min-h-[400px]">
        {paginatedItems.length === 0 ? (
          <div className="bg-white/60 p-16 rounded-3xl text-center border border-[#E09F26]/15 flex flex-col items-center justify-center">
            <Inbox className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm font-medium">
              {tab === "feedbacks" && feedbackStatusFilter === "deleted" 
                ? "Trash is empty. No deleted feedback found." 
                : "No records found matching your current filter."}
            </p>
          </div>
        ) : (
          <div className={`grid gap-5 animate-fadeIn ${
            isProverbView ? "grid-cols-1 lg:grid-cols-2" : 
            tab === "feedbacks" ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : 
            "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:!grid-cols-5"
          }`}>
            {/* CULTURAL ITEMS */}
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

            {/* PROVERB ITEMS */}
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

            {/* UPGRADED ENTERPRISE FEEDBACK CARDS */}
            {tab === "feedbacks" && paginatedItems.map(fb => {
              const isBug = fb.feedbackType === "Bug Report";
              const isLowRating = (fb.rating || 5) <= 2;
              const isUrgent = isBug || isLowRating;
              const isDeleted = fb.isDeleted === true || fb.status === "deleted";

              const formattedDate = fb.createdAt?.toDate 
                ? fb.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : "Just now";

              return (
                <div 
                  key={fb.id} 
                  className={`bg-white rounded-2xl flex flex-col shadow-xs border p-4 h-64 transition-all hover:shadow-lg relative overflow-hidden ${
                    isUrgent && !isDeleted && fb.status !== "resolved" 
                      ? "border-red-300 ring-1 ring-red-200" 
                      : "border-[#E09F26]/20"
                  }`}
                >
                  {/* CARD HEADER */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col truncate pr-2">
                      <h4 className="text-xs font-bold text-[#4A0C16] truncate" title={fb.userEmail}>
                        {fb.userName || fb.userEmail || "Anonymous User"}
                      </h4>
                      <span className="text-[9px] text-gray-400 font-medium">{formattedDate}</span>
                    </div>

                    {/* STATUS BADGE + SOFT DELETE ICON */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isDeleted && (
                        <button 
                          onClick={() => handleSoftDeleteFeedback(fb.id)} 
                          title="Move to Trash"
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                        isDeleted 
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : fb.status === 'resolved' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {isDeleted ? 'In Trash 🗑️' : fb.status === 'resolved' ? 'Resolved ✓' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* RATING & PRIORITY TAGS */}
                  <div className="flex items-center justify-between mb-2.5 gap-2">
                    {/* Star Rating Display */}
                    <div className="flex items-center gap-1 bg-[#FEF9C3]/80 px-2 py-1 rounded-xl border border-[#E09F26]/30">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={11}
                          className={`${
                            s <= (fb.rating || 5)
                              ? "fill-[#E09F26] text-[#E09F26]"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                      <span className="text-[10px] font-black text-[#4A0C16] ml-0.5">{fb.rating || 5}.0</span>
                    </div>

                    {/* Priority Badge */}
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg shrink-0 ${
                      isUrgent && !isDeleted && fb.status !== 'resolved'
                        ? "bg-red-100 text-red-700 border border-red-200" 
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {isUrgent && !isDeleted && fb.status !== 'resolved' ? "🔴 Urgent" : fb.feedbackType || "General"}
                    </span>
                  </div>

                  {/* MESSAGE BODY */}
                  <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                    <p className="text-gray-700 text-xs italic pr-1 leading-relaxed">
                      "{fb.message}"
                    </p>
                  </div>

                  {/* ACTION BUTTONS */}
                  {isDeleted ? (
                    /* Trash View Actions: Restore or Hard Delete */
                    <div className="flex gap-2 mt-3">
                      <button 
                        onClick={() => handleRestoreFeedback(fb.id)} 
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RotateCcw size={13} /> Restore
                      </button>
                      <button 
                        onClick={() => handleHardDeleteFeedback(fb.id)} 
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={13} /> Delete Forever
                      </button>
                    </div>
                  ) : (
                    /* Active View Actions: Resolve / Reopen */
                    <button 
                      onClick={() => handleToggleFeedbackStatus(fb.id, fb.status)} 
                      className={`w-full mt-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                        fb.status === "resolved" 
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200" 
                          : "bg-[#4A0C16] text-white hover:bg-[#31080E]"
                      }`}
                    >
                      {fb.status === "resolved" ? 'Reopen Ticket ↺' : 'Mark as Resolved ✓'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="mt-10 pt-6 border-t border-[#E09F26]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400 font-medium">
            Showing <span className="font-bold text-[#4A0C16]">{Math.min(currentPage * itemsPerPage, filteredActiveItems.length)}</span> of <span className="font-bold text-[#4A0C16]">{filteredActiveItems.length}</span>
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
            <button disabled={currentPage <= 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} className="p-2.5 rounded-xl bg-white border border-[#E09F26]/30 text-[#4A0C16] disabled:opacity-40 hover:bg-gray-50 transition shadow-xs cursor-pointer">
              <ChevronLeft size={18} />
            </button>
            <div className="flex flex-col items-center flex-1 max-w-[250px] w-full px-4">
              <span className="text-xs font-bold text-[#4A0C16] font-mono mb-2 uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
              <input type="range" min="1" max={totalPages} value={currentPage} onChange={(e) => setCurrentPage(Number(e.target.value))} className="w-full h-1.5 bg-[#E09F26]/30 rounded-lg appearance-none cursor-pointer accent-[#4A0C16]" />
            </div>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} className="p-2.5 rounded-xl bg-white border border-[#E09F26]/30 text-[#4A0C16] disabled:opacity-40 hover:bg-gray-50 transition shadow-xs cursor-pointer">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      <ConfirmationModal isOpen={confirmConfig.isOpen} config={confirmConfig} onClose={closeConfirm} />
    </MasterDashboardShell>
  );
};

export default ModeratorDashboard;