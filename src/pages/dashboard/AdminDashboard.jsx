import React, { useEffect, useState, useMemo } from "react";

import { 
  collection, query, where, or, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, writeBatch, getDocs 
} from "firebase/firestore";

import { db, auth } from "../../firebase/firebase";

import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie
} from "recharts";

import {
  BookOpen, Archive, Users, Search, ChevronLeft, ChevronRight, Inbox, Activity, ShieldCheck, BarChart3, Layers, Quote, Loader2, Trash2, RefreshCw, AlertTriangle
} from "lucide-react";

import { notifyRole, sendNotification } from "../../services/notificationService";
import { useToast } from "../../components/ToastContext";
import MasterDashboardShell from "../../components/MasterDashboardShell";
import SharedPublishedProverbs from "../../pages/shared/SharedPublishedProverbs";

// Import the Universal Confirmation Modal
import ConfirmationModal from "../../components/ConfirmationModal";

const COLORS = ["#4A0C16", "#E09F26", "#10B981", "#3B82F6"];

const AdminDashboard = ({ changePage, triggerLogout, initialTab }) => {
  const { showToast } = useToast();

  // Control States with Session Storage Persistence
  const [tab, setTab] = useState(() => {
    return initialTab || sessionStorage.getItem("adminTab") || "analytics";
  });

  const [items, setItems] = useState([]); // Cultural Items (All)
  const [publishedProverbs, setPublishedProverbs] = useState([]); // Published Proverbs Array
  const [binnedProverbs, setBinnedProverbs] = useState([]); // Deleted Proverbs
  const [users, setUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0); 
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [brokenImages, setBrokenImages] = useState({});

  // Sync tab if initialTab prop changes from navigation
  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
      sessionStorage.setItem("adminTab", initialTab);
    }
  }, [initialTab]);

  // Persist tab changes to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("adminTab", tab);
  }, [tab]);

  // Recycle Bin States
  const [binFilter, setBinFilter] = useState("cultural"); // "cultural" | "proverb"

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Pagination States
  const [validationPage, setValidationPage] = useState(1);
  const [archivePage, setArchivePage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [binPage, setBinPage] = useState(1);
  
  const itemsPerPage = (tab === "validation" || tab === "archive" || tab === "recycle_bin") ? 15 : 8; 

  // --- NEW UNIVERSAL MODAL STATE ---
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    confirmText: "",
    onConfirm: () => {},
  });

  const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

  // ================= REAL-TIME DATABASE LISTENERS =================
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "culturalItems"), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      showToast(err.message, "error");
    });
    return () => unsub();
  }, [showToast]);

  useEffect(() => {
    const q = query(collection(db, "proverb"), where("isDeleted", "==", true));
    const unsub = onSnapshot(q, (snapshot) => {
      setBinnedProverbs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Deleted Proverbs listener error:", err);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "proverb"));
    const unsub = onSnapshot(q, (snapshot) => {
      const allProverbs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const posted = allProverbs.filter(p => p.status === "posted" && !p.isDeleted);
      setPublishedProverbs(posted);
    }, (err) => {
      console.error("Proverbs listener error:", err);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      showToast(err.message, "error");
    });
    return () => unsub();
  }, [showToast]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const currentUid = auth.currentUser.uid;
    
    const q = query(
      collection(db, "notifications"),
      or(
        where("userId", "==", currentUid),
        where("targetRoles", "array-contains", "admin"),
        where("targetRole", "==", "admin"),
        where("role", "==", "admin")
      )
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const unread = snapshot.docs.filter(doc => {
        const data = doc.data();
        if (data.read === true || data.read === "true") return false;
        if (data.isReadBy && data.isReadBy.includes(currentUid)) return false;

        const isMyIndividualNotif = data.userId === currentUid;
        const rolesArray = data.targetRoles || [];
        const singleRole = data.targetRole || data.role || "";
        const matchesMyRole = rolesArray.includes("admin") || singleRole.toLowerCase() === "admin";

        return isMyIndividualNotif || matchesMyRole;
      });

      setUnreadCount(unread.length);
    }, (error) => {
      console.error("Notification listener error:", error);
    });
    
    return () => unsub();
  }, []);
  
  // ================= DATA DERIVATION (MEMOIZED) =================
  const { activeItems, binnedCulturalItems } = useMemo(() => {
    return {
      activeItems: items.filter(i => !i.isDeleted),
      binnedCulturalItems: items.filter(i => i.isDeleted === true)
    };
  }, [items]);

  const { allPosted, allValidated, allReturned, statusData, totalUsersCount } = useMemo(() => {
    const posted = activeItems.filter(i => i.status === "posted");
    const validated = activeItems.filter(i => 
      i.status !== "pending_moderation" && 
      (i.status === "validated" || i.status === "pending" || i.status === "uploaded")
    );
    const returned = activeItems.filter(i => i.status === "returned");
    return {
      allPosted: posted,
      allValidated: validated,
      allReturned: returned,
      totalUsersCount: users.length,
      statusData: [
        { name: "Live Posted", value: posted.length },
        { name: "To Validate", value: validated.length },
        { name: "Returned", value: returned.length }
      ]
    };
  }, [activeItems, users]);

  const statsMetrics = useMemo(() => {
    const totalPublished = allPosted.length + publishedProverbs.length;
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const filterNew = (item) => {
      const timestamp = item.createdAt?.toDate ? item.createdAt.toDate() : null;
      return timestamp && timestamp > oneWeekAgo;
    };

    const newCultural = allPosted.filter(filterNew).length;
    const newProverbs = publishedProverbs.filter(filterNew).length;
    const newThisWeek = newCultural + newProverbs;

    return {
      totalPublished,
      newThisWeek,
      totalUsers: totalUsersCount
    };
  }, [allPosted, publishedProverbs, totalUsersCount]);

  const { categoryData, uniqueCategories } = useMemo(() => {
    const categoryMap = {};
    allPosted.forEach(item => {
      const cat = item.category || "Unknown";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const catData = Object.keys(categoryMap).map(key => ({ name: key, value: categoryMap[key] }));
    const uniqueCats = ["All", ...new Set(activeItems.map(item => item.category).filter(Boolean))];
    return { categoryData: catData, uniqueCategories: uniqueCats };
  }, [activeItems, allPosted]);

  // UPDATED: Enhanced Item filtering (Title, Description, Meaning, and Tags)
  const { displayValidated, displayPosted } = useMemo(() => {
    const filtered = activeItems.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        (item.title || "").toLowerCase().includes(searchLower) ||
        (item.description || "").toLowerCase().includes(searchLower) ||
        (item.meaning || "").toLowerCase().includes(searchLower) ||
        (item.tags && Array.isArray(item.tags) && item.tags.some(tag => tag.toLowerCase().includes(searchLower)));
        
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    return {
      displayValidated: filtered.filter(i => 
        i.status !== "pending_moderation" && 
        (i.status === "validated" || i.status === "pending" || i.status === "uploaded")
      ),
      displayPosted: filtered.filter(i => i.status === "posted")
    };
  }, [activeItems, searchQuery, selectedCategory]);

  // NEW: Search for Users
  const displayUsers = useMemo(() => {
    return users.filter(u => {
      const searchLower = searchQuery.toLowerCase();
      return (u.email || "").toLowerCase().includes(searchLower) ||
             (u.role || "").toLowerCase().includes(searchLower);
    });
  }, [users, searchQuery]);

  const recentActivity = useMemo(() => {
    return [...activeItems].sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || 0;
      const timeB = b.createdAt?.toMillis() || 0;
      return timeB - timeA;
    }).slice(0, 5);
  }, [activeItems]);

  // UPDATED: Search for Recycle Bin Items
  const activeBinItems = useMemo(() => {
    const baseItems = binFilter === "cultural" ? binnedCulturalItems : binnedProverbs;
    return baseItems.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      return (item.title || "").toLowerCase().includes(searchLower) ||
             (item.proverb || "").toLowerCase().includes(searchLower) ||
             (item.description || "").toLowerCase().includes(searchLower) ||
             (item.meaning || "").toLowerCase().includes(searchLower);
    });
  }, [binFilter, binnedCulturalItems, binnedProverbs, searchQuery]);

  // Pagination Boundaries
  const indexOfLastValidation = validationPage * itemsPerPage;
  const indexOfFirstValidation = indexOfLastValidation - itemsPerPage;
  const currentValidationItems = displayValidated.slice(indexOfFirstValidation, indexOfLastValidation);

  const indexOfLastArchive = archivePage * itemsPerPage;
  const indexOfFirstArchive = indexOfLastArchive - itemsPerPage;
  const currentArchiveItems = displayPosted.slice(indexOfFirstArchive, indexOfLastArchive);

  const indexOfLastUser = usersPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsersItems = displayUsers.slice(indexOfFirstUser, indexOfLastUser);

  const indexOfLastBin = binPage * itemsPerPage;
  const indexOfFirstBin = indexOfLastBin - itemsPerPage;
  const currentBinViewItems = activeBinItems.slice(indexOfFirstBin, indexOfLastBin);

  // Synchronize Tab State Resets
  useEffect(() => {
    setValidationPage(1);
    setArchivePage(1);
    setUsersPage(1);
    setBinPage(1);
  }, [tab, searchQuery, selectedCategory, binFilter]);

  // ================= ACTION HANDLERS =================

  const handleDeleteItem = (itemId) => {
    if (isSubmitting) return;
    setConfirmConfig({
      isOpen: true,
      title: "Relocate to Bin",
      message: "Are you sure you want to move this item to the Recycle Bin? It will be removed from the public archive and all user bookmarks.",
      type: "danger",
      confirmText: "Move to Bin",
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          
          await updateDoc(doc(db, "culturalItems", itemId), { 
            isDeleted: true,
            status: "trashed", // THIS is what hides it from the other dashboards!
            deletedAt: serverTimestamp(),
            deletedBy: auth.currentUser?.uid
          });


          const bookmarksRef = collection(db, "bookmarks");
          const q = query(bookmarksRef, where("itemId", "==", itemId));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach((bookmarkDoc) => {
              batch.delete(bookmarkDoc.ref);
            });
            await batch.commit();
          }

          showToast('Record relocated to system bin and bookmarks cleared.', "success");
        } catch (err) { 
          showToast(err.message, "error"); 
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const handleRestoreFromBin = (item) => {
    if (isSubmitting) return;
    setConfirmConfig({
      isOpen: true,
      title: "Restore Record",
      message: `Reinstall "${item.title || item.proverb || 'this item'}" back into the validation queue?`,
      type: "restore",
      confirmText: "Restore Now",
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const collectionName = binFilter === "cultural" ? "culturalItems" : "proverb";
          const resetStatus = binFilter === "cultural" ? "pending" : "pending_moderation";

          await updateDoc(doc(db, collectionName, item.id), {
            isDeleted: false,
            status: resetStatus,
            restoredAt: serverTimestamp()
          });

          await notifyRole({
            role: "moderator",
            message: `Admin restored ${binFilter === "cultural" ? "Cultural Item" : "Proverb"} "${item.title || 'Data'}". Review required.`,
            type: "item_restored",
            itemId: item.id,
            isReadBy: []
          });

          showToast("Item restored to queue.", "success");
        } catch (err) {
          showToast(err.message, "error");
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const handlePermanentDelete = (itemId) => {
    if (isSubmitting) return;
    setConfirmConfig({
      isOpen: true,
      title: "Permanent Purge",
      message: "WARNING: This action is absolute. This record will be permanently wiped from the database clusters.",
      type: "danger",
      confirmText: "Purge Data",
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const collectionName = binFilter === "cultural" ? "culturalItems" : "proverb";
          await deleteDoc(doc(db, collectionName, itemId));
          showToast("Data permanently purged from system.", "success");
        } catch (err) {
          showToast(err.message, "error");
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const initiateRoleChange = (userDoc, newRole) => {
    if (isSubmitting) return;
    setConfirmConfig({
      isOpen: true,
      title: "Security Clearance Change",
      message: `Adjust clearance level for ${userDoc.email} to: ${newRole.toUpperCase()}?`,
      type: "security",
      confirmText: "Authorize Change",
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          await updateDoc(doc(db, "users", userDoc.id), { role: newRole });
          
          await sendNotification({
            userId: userDoc.id,
            message: `Your clearance profile has been updated to: ${newRole.toUpperCase()}`,
            type: "role_update"
          });
          
          showToast('Security clearance adjusted successfully.', "success");
        } catch (err) {
          showToast(err.message, "error");
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const handleImageError = (id) => {
    setBrokenImages(prev => ({ ...prev, [id]: true }));
  };

  const getUserDisplayName = () => {
    if (auth.currentUser?.displayName) return auth.currentUser.displayName;
    const targetEmail = auth.currentUser?.email || "";
    return targetEmail.split("@")[0];
  };

  const renderPaginationSlider = (currentPage, setPage, totalItems, itemsPerPage) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    if (totalItems <= itemsPerPage) return null;

    return (
      <div className="mt-8 pt-4 border-t border-[#E09F26]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button 
          disabled={currentPage === 1} 
          onClick={() => setPage(prev => Math.max(prev - 1, 1))} 
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
            onChange={(e) => setPage(Number(e.target.value))}
            className="w-full h-1.5 bg-[#E09F26]/30 rounded-lg appearance-none cursor-pointer accent-[#4A0C16]"
            title="Slide to change pages"
          />
        </div>

        <button 
          disabled={currentPage >= totalPages} 
          onClick={() => setPage(prev => Math.min(prev + 1, totalPages))} 
          className="p-2.5 rounded-xl bg-white border border-[#E09F26]/30 text-[#4A0C16] disabled:opacity-40 hover:bg-gray-50 transition shadow-sm"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    );
  };

  const totalBinCount = binnedCulturalItems.length + binnedProverbs.length;

  const adminLinks = [
    { value: "analytics", label: "Analytics Matrix", icon: <BarChart3 size={16} /> },
    { value: "validation", label: "Pending Validation", icon: <Layers size={16} />, badge: allValidated.length.toString() },
    { value: "users", label: "Access Controls", icon: <Users size={16} /> },
    { value: "published_proverbs", label: "Posted Proverbs", icon: <Quote size={16} />, badge: publishedProverbs.length.toString() },
    { value: "archive", label: "Cultural archive", icon: <Archive size={16} />, badge: allPosted.length.toString() },
    { value: "recycle_bin", label: "Recycle Bin", icon: <Trash2 size={16} />, badge: totalBinCount.toString() }
  ];

  return (
    <MasterDashboardShell
      userRole="admin"
      userName={getUserDisplayName()}
      activeTab={tab}
      setActiveTab={setTab}
      sidebarLinks={adminLinks}
      notificationCount={unreadCount}
      onNotificationClick={() => changePage("notifications", { fromPage: "dashboard" })}
      onLogout={triggerLogout}
    >
      {/* 📊 METRICS SUMMARY PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-[#4A0C16] hover:bg-gray-50 transition-all duration-300">
          <p className="text-[#4A0C16] text-xs font-bold uppercase tracking-wider">Total Published</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-black text-[#4A0C16] font-serif mt-1">{statsMetrics.totalPublished}</h2>
            <span className="text-[10px] text-[#4A0C16]/70 font-bold uppercase">Items + Proverbs</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-[#4A0C16] hover:bg-gray-50 transition-all duration-300">
          <p className="text-[#4A0C16] text-xs font-bold uppercase tracking-wider">New This Week</p>
          <h2 className="text-3xl font-black text-[#4A0C16] font-serif mt-1">+{statsMetrics.newThisWeek}</h2>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-[#4A0C16] hover:bg-gray-50 transition-all duration-300">
          <p className="text-[#4A0C16] text-xs font-bold uppercase tracking-wider">Total Users</p>
          <h2 className="text-3xl font-black text-[#4A0C16] font-serif mt-1">{statsMetrics.totalUsers}</h2>
        </div>
      </div>

      <hr className="my-8 border-t border-[#E09F26]/20 mx-auto w-[98%]" />

      {/* 🔍 UPDATED: FILTERING UTILITY UNIT (Now appears for Users and Bin too) */}
      {(tab === "validation" || tab === "archive" || tab === "users" || tab === "recycle_bin") && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E09F26] transition-colors" size={16} />
            <input 
              type="text" 
              placeholder={tab === "users" ? "Search by email or role..." : "Search entries, descriptions, tags..."} 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#E09F26]/20 focus:outline-none focus:border-[#E09F26] focus:ring-4 focus:ring-[#E09F26]/10 shadow-xs bg-white text-sm font-medium text-[#4A0C16] transition-all" 
            />
          </div>
          {(tab === "validation" || tab === "archive") && (
            <div className="relative sm:min-w-[200px]">
                <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)} 
                className="w-full px-4 py-3 rounded-2xl border border-[#E09F26]/20 focus:outline-none focus:border-[#E09F26] focus:ring-4 focus:ring-[#E09F26]/10 shadow-xs bg-white cursor-pointer text-sm font-bold text-[#4A0C16] transition-all appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234A0C16'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.1em' }}
                >
                {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat === "All" ? "All Categories" : cat}</option>)}
                </select>
            </div>
          )}
        </div>
      )}

      {/* 🖥️ CENTRAL RENDERING ENGINE */}
      <div className="min-h-[400px]">
        
        {/* TAB: ANALYTICS MATRIX */}
        {tab === "analytics" && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-6 shadow-[0_4px_25px_rgba(74,12,22,0.01)] border border-[#E09F26]/15 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Activity size={120} className="text-[#4A0C16]" />
                </div>
                <h3 className="text-base font-bold text-[#4A0C16] font-serif mb-1">System Cluster Telemetry</h3>
                <p className="text-gray-400 text-xs mb-6 font-sans">Real-time repository item data profiling logs</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E09F26" opacity={0.15} />
                    <XAxis dataKey="name" tick={{fontSize: 11, fontWeight: 600, fill: '#4A0C16'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 11, fill: '#4A0C16'}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(74,12,22,0.02)' }} contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid rgba(224,159,38,0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="value" fill="#4A0C16" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? "#10B981" : index === 1 ? "#E09F26" : "#EF4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-[0_4px_25px_rgba(74,12,22,0.01)] border border-[#E09F26]/15 relative overflow-hidden">
                <h3 className="text-base font-bold text-[#4A0C16] font-serif mb-1">Category Partition Distribution</h3>
                <p className="text-gray-400 text-xs mb-6 font-sans">Proportional scanning density across public profiles</p>
                <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4">
                  <div className="w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={categoryData} dataKey="value" outerRadius={95} innerRadius={70} paddingAngle={4} strokeWidth={2} stroke="#ffffff">
                          {categoryData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} style={{ filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.05))' }} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid rgba(224,159,38,0.2)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full sm:w-1/2 grid grid-cols-2 gap-3">
                    {categoryData.map((data, idx) => (
                      <div key={idx} className="p-2.5 bg-gray-50/50 rounded-2xl border border-gray-100 flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-[11px] font-bold text-gray-500 truncate block max-w-[80px]">{data.name}</span>
                        </div>
                        <span className="text-xl font-bold font-serif text-[#4A0C16] pl-4">{data.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-[#E09F26]/15 p-6 shadow-[0_4px_25px_rgba(74,12,22,0.01)]">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <Activity className="text-[#E09F26] w-5 h-5" />
                <h3 className="text-base font-bold text-[#4A0C16] font-serif">Live Production Event Feed</h3>
              </div>
              {recentActivity.length === 0 ? (
                <p className="text-gray-400 text-xs italic py-4">No tracking entries recorded.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentActivity.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3 hover:bg-[#FEF9C3]/10 transition-colors rounded-xl px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                          {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-[9px] text-[#4A0C16] font-black bg-[#4A0C16]/5">N/A</div>}
                        </div>
                        <div>
                          <p className="font-bold text-[#4A0C16] text-sm leading-tight">{item.title}</p>
                          <p className="text-[10px] font-bold text-[#E09F26] uppercase tracking-wider mt-0.5">{item.category}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${item.status === 'posted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : item.status === 'returned' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                        {item.status === 'pending_moderation' ? 'In Moderation' : (item.status === 'validated' || item.status === 'pending' || item.status === 'uploaded' ? 'pending' : item.status)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: VALIDATION QUEUE */}
        {tab === "validation" && (
          <div className="animate-fadeIn">
            {displayValidated.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-sm p-16 rounded-3xl text-center border border-[#E09F26]/15 flex flex-col items-center justify-center max-w-lg mx-auto">
                <Inbox className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm font-medium">Queue parameters clear. No elements require clearance.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:!grid-cols-5 2xl:!grid-cols-5 gap-4">
                {currentValidationItems.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl overflow-hidden flex flex-col shadow-xs border border-[#E09F26]/20 hover:border-[#E09F26]/40 transition-all duration-300 group">
                    <div className="h-32 overflow-hidden relative shrink-0 bg-gray-50 border-b border-gray-100">
                      {item.imageUrl && !brokenImages[item.id] ? (
                        <img 
                          src={item.imageUrl} 
                          onError={() => handleImageError(item.id)}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          alt={item.title}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 text-[10px] font-medium">
                          <BookOpen size={18} className="mb-0.5 opacity-20" />
                          No Media Item
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 flex flex-col flex-1 justify-between bg-white">
                      <div>
                        <span className="inline-block px-1.5 py-0.5 bg-[#FEF9C3] text-[#4A0C16] text-[8px] font-black uppercase tracking-wider rounded border border-[#E09F26]/20 mb-1">{item.category}</span>
                        <h3 className="text-xs font-bold text-[#4A0C16] line-clamp-2 font-serif leading-tight">{item.title}</h3>
                        <p className="text-[10px] text-gray-400 mt-1.5 line-clamp-2 leading-tight">
                          {item.description || item.meaning}
                        </p>
                      </div>
                      
                      <div className="mt-3 pt-2 border-t border-gray-50">
                        <button
                          onClick={() => {
                            const isProverb = item.category === "Proverb";
                            changePage(isProverb ? "proverbdetail" : "itemdetail", {
                              itemId: item.id,
                              fromPage: "dashboard",
                              role: "admin",
                              itemType: isProverb ? "proverb" : "cultural"
                            });
                          }}
                          className="w-full bg-[#4A0C16] hover:bg-[#31080E] text-white py-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <BookOpen size={12} /> Review Item Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {renderPaginationSlider(validationPage, setValidationPage, displayValidated.length, itemsPerPage)}
          </div>
        )}

        {/* TAB: ACCESS CONTROL */}
        {tab === "users" && (
          <div className="animate-fadeIn">
            {displayUsers.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-sm p-16 rounded-3xl text-center border border-[#E09F26]/15 flex flex-col items-center justify-center max-w-lg mx-auto">
                <Users className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm font-medium">No system security records matching your search.</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-[0_4px_25px_rgba(74,12,22,0.01)] overflow-hidden border border-[#E09F26]/15">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#4A0C16] border-b border-[#E09F26]/20">
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-[#E09F26] pl-6">Account Email Address</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-[#E09F26] pr-6">Assigned Context Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {currentUsersItems.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-4 font-mono text-xs text-[#4A0C16] font-semibold pl-6">{u.email}</td>
                          <td className="p-4 pr-6">
                            <select
                              value={u.role || "user"}
                              onChange={(e) => initiateRoleChange(u, e.target.value)}
                              className="bg-[#FEF9C3]/50 text-[#4A0C16] border border-[#E09F26]/30 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#4A0C16] cursor-pointer transition"
                            >
                              <option value="user">User</option>
                              <option value="encoder">Encoder</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {renderPaginationSlider(usersPage, setUsersPage, displayUsers.length, itemsPerPage)}
          </div>
        )}

        {/* TAB: POSTED PROVERBS COMPONENT */}
        {tab === "published_proverbs" && (
          <SharedPublishedProverbs changePage={changePage} role="admin" />
        )}

        {/* TAB: CULTURAL ARCHIVE */}
        {tab === "archive" && (
          <div className="animate-fadeIn">
            {/* The sidebar count uses displayPosted.length, which is now filtered correctly */}
            {displayPosted.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-sm p-16 rounded-3xl text-center border border-[#E09F26]/15 flex flex-col items-center justify-center max-w-lg mx-auto">
                <Archive className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm font-medium">No published items found within system archive clusters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:!grid-cols-5 2xl:!grid-cols-5 gap-4">
                {currentArchiveItems.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl overflow-hidden flex flex-col shadow-xs border border-[#E09F26]/20 hover:border-[#E09F26]/40 transition-all duration-300 group">
                    <div className="h-32 overflow-hidden relative shrink-0 bg-gray-50 border-b border-gray-100">
                      {item.imageUrl && !brokenImages[item.id] ? (
                        <img 
                          src={item.imageUrl} 
                          onError={() => handleImageError(item.id)}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          alt={item.title}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 text-[10px] font-medium">
                          <BookOpen size={18} className="mb-0.5 opacity-20" />
                          No Media Item
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 flex flex-col flex-1 justify-between bg-white">
                      <div>
                        <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase tracking-wider rounded border border-emerald-200 mb-1">Posted</span>
                        <h3 className="text-xs font-bold text-[#4A0C16] line-clamp-2 font-serif leading-tight">{item.title}</h3>
                        <p className="text-[10px] text-gray-400 mt-1.5 line-clamp-2 leading-tight">
                          {item.description || item.meaning}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-gray-50">
                        <button 
                          onClick={() => {
                            const isProverb = (item.proverb || item.category === "Proverb");
                            changePage(isProverb ? "proverbdetail" : "itemdetail", { 
                              itemId: item.id, 
                              fromPage: "dashboard", 
                              role: "admin",
                              itemType: isProverb ? "proverb" : "cultural"
                            });
                          }} 
                          className="w-full bg-gray-100 hover:bg-gray-200 text-[#4A0C16] py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1"
                        >
                          <BookOpen size={10} /> View
                        </button>
                        <button 
                          disabled={isSubmitting}
                          onClick={() => handleDeleteItem(item.id)} 
                          className="w-full bg-red-50 hover:bg-red-600 hover:text-white text-red-600 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          {isSubmitting ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />} Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Correct pagination count */}
            {renderPaginationSlider(archivePage, setArchivePage, displayPosted.length, itemsPerPage)}
          </div>
        )}

        {/* TAB: RECYCLE BIN */}
        {tab === "recycle_bin" && (
          <div className="animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#4A0C16] font-serif">Recycle Bin</h2>
                <p className="text-xs text-gray-500">Restore or permanently purge deleted records</p>
              </div>
              
              <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button 
                  onClick={() => setBinFilter("cultural")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${binFilter === "cultural" ? "bg-white text-[#4A0C16] shadow-sm" : "text-gray-500 hover:text-[#4A0C16]"}`}
                >
                  Cultural Items
                </button>
                <button 
                  onClick={() => setBinFilter("proverb")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${binFilter === "proverb" ? "bg-white text-[#4A0C16] shadow-sm" : "text-gray-500 hover:text-[#4A0C16]"}`}
                >
                  Proverbs
                </button>
              </div>
            </div>

            {activeBinItems.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-sm p-16 rounded-3xl text-center border border-[#E09F26]/15 flex flex-col items-center justify-center max-w-lg mx-auto">
                <Trash2 className="w-10 h-10 text-gray-200 mb-2" />
                <p className="text-gray-400 text-sm font-medium">Bin directory is currently empty or no results match your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentBinViewItems.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center text-red-200">
                        {binFilter === "cultural" && item.imageUrl ? (
                          <img src={item.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                        ) : (
                          binFilter === "cultural" ? <Layers size={24} /> : <Quote size={24} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-tighter text-red-400 bg-red-50 px-1.5 py-0.5 rounded inline-block mb-1">
                          Deleted {item.deletedAt ? new Date(item.deletedAt.seconds ? item.deletedAt.seconds * 1000 : item.deletedAt).toLocaleDateString() : 'Recently'}
                        </span>
                        <h4 className="font-bold text-[#4A0C16] text-sm truncate mt-1">
                          {binFilter === "cultural" ? item.title : (item.proverb || "Untitled Proverb")}
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-tight">
                          {binFilter === "cultural" ? item.description : item.meaning}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-50">
                      <button 
                        onClick={() => {
                          const isProverb = binFilter === "proverb";
                          changePage(isProverb ? "proverbdetail" : "itemdetail", { 
                            itemId: item.id, 
                            fromPage: "dashboard", 
                            role: "admin",
                            itemType: binFilter 
                          });
                        }}
                        className="bg-gray-100 hover:bg-gray-200 text-[#4A0C16] py-2 rounded-lg text-[10px] font-bold transition-colors text-center flex justify-center items-center gap-1"
                      >
                        <BookOpen size={10} /> View
                      </button>

                      <button 
                        disabled={isSubmitting}
                        onClick={() => handleRestoreFromBin(item)}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {isSubmitting ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                        Restore
                      </button>

                      <button 
                        disabled={isSubmitting}
                        onClick={() => handlePermanentDelete(item.id)}
                        className="bg-red-50 hover:bg-red-600 hover:text-white text-red-600 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {isSubmitting ? <Loader2 size={10} className="animate-spin" /> : <AlertTriangle size={10} />}
                        Purge
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {renderPaginationSlider(binPage, setBinPage, activeBinItems.length, itemsPerPage)}
          </div>
        )}

      </div>

      {/* 🔐 UNIVERSAL CONFIRMATION MODAL */}
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen} 
        config={confirmConfig} 
        onClose={closeConfirm} 
      />

    </MasterDashboardShell>
  );
};

export default AdminDashboard;