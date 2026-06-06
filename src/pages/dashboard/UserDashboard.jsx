import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { useToast } from "../../contexts/ToastContext";

import { db, auth } from "../../firebase/firebase";

import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  addDoc,
  query,
  where // ✅ Added 'where' explicitly here
} from "firebase/firestore";

import {
  BookOpen, Bell, Bookmark, Search,
  ChevronLeft, ChevronRight, Sparkles, MessageSquare, 
  HelpCircle, AlertTriangle, Lightbulb, X, Loader2, LayoutDashboard, Quote
} from "lucide-react";

import MasterDashboardShell from "../../components/MasterDashboardShell";
import okirPattern from "../../assets/okir-pattern.png";

// Shared Universal Component for the Proverb Grid View
import ProverbPosted from "../proverbs/ProverbPosted";
import { useSystemData } from "../../hooks/useSystemData"; // Adjusted for unified data layer

const UserDashboard = ({ user, changePage, triggerLogout }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();

  // ================= SESSION STORAGE INITIALIZATION =================
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem("userActiveTab") || "dashboard";
  });

  const [search, setSearch] = useState(() => {
    return sessionStorage.getItem("userSearch") || "";
  });

  const [category, setCategory] = useState(() => {
    return sessionStorage.getItem("userCategory") || "all";
  });

  const [sortBy, setSortBy] = useState(() => {
    return sessionStorage.getItem("userSortBy") || "newest";
  });

  // ================= PERSISTENCE EFFECTS =================
  useEffect(() => {
    sessionStorage.setItem("userActiveTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem("userSearch", search);
  }, [search]);

  useEffect(() => {
    sessionStorage.setItem("userCategory", category);
  }, [category]);

  useEffect(() => {
    sessionStorage.setItem("userSortBy", sortBy);
  }, [sortBy]);

  // ================= SEARCH ANALYTICS TRACKER (DEBOUNCED) =================
  useEffect(() => {
    const cleanSearch = search.trim().toLowerCase();
    
    // Only track if the word is at least 3 letters long
    if (!cleanSearch || cleanSearch.length < 3) return;

    // Debounce: Wait 1.5 seconds after typing stops
    const debounceTimer = setTimeout(async () => {
      try {
        await addDoc(collection(db, "search_analytics"), {
          query: cleanSearch,
          userId: user?.uid || "anonymous",
          categoryScope: category || "all",
          timestamp: serverTimestamp()
        });
        console.log("Search tracked successfully!"); // Optional: just so you can see it work in your console
      } catch (error) {
        console.error("Search Tracking Error:", error);
      }
    }, 1500);

    return () => clearTimeout(debounceTimer);
  }, [search, category, user?.uid]);

  // ================= SYSTEM DATA INTEGRATION =================
  const { 
    culturalItems: rawCulturalItems = [], 
    unreadCount: unreadNotifications 
  } = useSystemData("user");

  // Filter local state dependencies cleanly using useMemo to mirror native status targets
  const items = useMemo(() => {
    return rawCulturalItems.filter(item => item.status === "posted" && !item.isDeleted);
  }, [rawCulturalItems]);

  // Core Data States (Kept local as they map exclusively to this user configuration)
  const [bookmarks, setBookmarks] = useState([]);
  const [starredProverbs, setStarredProverbs] = useState([]); 
  const [word, setWord] = useState(null);

  // UI States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Interactivity States
  const [brokenImages, setBrokenImages] = useState({});

  // System Feedback States
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState("General Comment");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null
  });

  // Profile Resolution State
  const [databaseName, setDatabaseName] = useState("");

  // ================= UTILITIES =================
  const handleImageError = (id) => {
    setBrokenImages(prev => ({ ...prev, [id]: true }));
  };

  useEffect(() => {
    if (!user?.uid) return;

    const userDocRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const foundName = data.name || data.fullName || data.displayName || data.firstName || data.username;
        if (foundName) {
          setDatabaseName(foundName);
        }
      }
    }, (error) => {
      console.error("Profile extraction listener error:", error);
    });

    return () => unsub();
  }, [user?.uid]);

  const computedName = useMemo(() => {
    if (databaseName) return databaseName;
    if (user?.name) return user.name;
    if (user?.displayName) return user.displayName;
    if (auth.currentUser?.displayName) return auth.currentUser.displayName;
    
    const targetEmail = user?.email || auth.currentUser?.email || "";
    return targetEmail ? targetEmail.split("@")[0] : "User";
  }, [user, databaseName]);

  // ================= LOCAL AD-HOC DATA FETCHING =================

  // 1. Bookmarks Listener (For Cultural Items mapped to this specific user)
  useEffect(() => {
    if (!user?.uid) return;
    
    const bookmarksQuery = query(collection(db, "bookmarks"), where("userId", "==", user.uid));
    
    const unsub = onSnapshot(bookmarksQuery, (snap) => {
      setBookmarks(snap.docs.map(doc => doc.data().itemId));
    }, (err) => console.error("Bookmarks sync error:", err));
    
    return () => unsub();
  }, [user?.uid]);

  // 2. Starred Proverbs Listener
  useEffect(() => {
    if (!user?.uid) return;
    
    const starredQuery = query(collection(db, "starredProverbs"), where("userId", "==", user.uid));
    
    const unsub = onSnapshot(starredQuery, (snap) => {
      setStarredProverbs(snap.docs.map(doc => doc.data().itemId));
    }, (err) => console.error("Starred proverbs sync error:", err));
    
    return () => unsub();
  }, [user?.uid]);

  // 3. Word of the Day Listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "wordOfDay"), (snap) => {
      if (!snap.empty) {
        setWord(snap.docs[0].data());
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, sortBy, activeTab]);

  // ================= PERFORMANCE MEMOIZATION =================
  const filteredItems = useMemo(() => {
    const lowerSearch = search.toLowerCase().trim();
    
    let result = items.filter(item => {
      const matchesSearch = 
        (item.title?.toLowerCase().includes(lowerSearch)) ||
        (item.description?.toLowerCase().includes(lowerSearch)) ||
        (Array.isArray(item.tags) && item.tags.some(tag => tag.toLowerCase().includes(lowerSearch)));
        
      const matchesCategory = category === "all" || item.category?.toLowerCase() === category.toLowerCase();
      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      if (sortBy === "a-z") return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "z-a") return (b.title || "").localeCompare(a.title || "");
      
      const getTime = (t) => t?.seconds ? t.seconds : (t?.toMillis ? t.toMillis() : 0);
      
      if (sortBy === "oldest") return getTime(a.createdAt) - getTime(b.createdAt);
      return getTime(b.createdAt) - getTime(a.createdAt);
    });

    return result;
  }, [items, search, category, sortBy]);

  const { currentItems, totalPages, indexOfFirstItem, indexOfLastItem } = useMemo(() => {
    const lastIdx = currentPage * itemsPerPage;
    const firstIdx = lastIdx - itemsPerPage;
    return {
      currentItems: filteredItems.slice(firstIdx, lastIdx),
      totalPages: Math.ceil(filteredItems.length / itemsPerPage),
      indexOfFirstItem: firstIdx,
      indexOfLastItem: lastIdx
    };
  }, [filteredItems, currentPage]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ================= MUTATIONS & ACTIONS =================
  const toggleBookmark = async (item) => {
    try {
      const uid = user?.uid;
      if (!uid) return showToast(t('userDashboard.errorAuth', 'You must be logged in to bookmark.'), 'error');
      
      const bookmarkRef = doc(db, "bookmarks", `${uid}_${item.id}`);
      const isBookmarked = bookmarks.includes(item.id);

      if (isBookmarked) {
        await deleteDoc(bookmarkRef);
        showToast(t('userDashboard.bookmarkRemoved', 'Bookmark removed.'), 'success');
      } else {
        await setDoc(bookmarkRef, {
          userId: uid,
          itemId: item.id,
          title: item.title,
          category: item.category || "Uncategorized",
          imageUrl: item.imageUrl || "",
          createdAt: serverTimestamp()
        });
        showToast(t('userDashboard.bookmarkAdded', 'Item saved to bookmarks!'), 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const toggleStarProverb = async (item) => {
    try {
      const uid = user?.uid;
      if (!uid) return;
      
      const starRef = doc(db, "starredProverbs", `${uid}_${item.id}`);
      const isStarred = starredProverbs.includes(item.id);

      if (isStarred) {
        await deleteDoc(starRef);
      } else {
        await setDoc(starRef, {
          userId: uid,
          itemId: item.id,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Error starring proverb:", err);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) {
      return showToast(t('userDashboard.feedbackEmpty', 'Please enter a message before submitting.'), 'error');
    }

    setIsSubmittingFeedback(true);
    try {
      await addDoc(collection(db, "systemFeedbacks"), {
        userId: user?.uid || "anonymous",
        userName: computedName,
        userEmail: user?.email || "anonymous@msu.edu.ph",
        feedbackType,
        message: feedbackMessage.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(collection(db, "notifications")), {
        targetRole: "moderator",
        role: "moderator", 
        message: `${computedName} submitted new feedback: ${feedbackType}.`,
        type: "user_feedback",
        createdAt: serverTimestamp(),
        read: false,
        isReadBy: []
      });

      showToast(t('userDashboard.feedbackSuccess', 'Thank you! Your feedback has been sent.'), 'success');
      setFeedbackMessage("");
      setFeedbackType("General Comment");
      setIsFeedbackModalOpen(false);
    } catch (error) {
      showToast(t('userDashboard.feedbackError', 'Failed to submit feedback. Check your connection.'), 'error');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleCloseFeedback = () => {
    if (feedbackMessage.trim()) {
      setConfirmModal({
        isOpen: true,
        title: t('userDashboard.confirmDiscardTitle', 'Discard Feedback?'),
        message: t('userDashboard.confirmDiscardMessage', 'You have unsaved changes. Are you sure you want to discard your feedback?'),
        onConfirm: () => {
          setIsFeedbackModalOpen(false);
          setFeedbackMessage("");
          setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: null });
        }
      });
    } else {
      setIsFeedbackModalOpen(false);
      setFeedbackMessage("");
    }
  };

  const userSidebarLinks = [
    { value: "dashboard", label: t('sidebar.culturalItems', "Cultural Items"), icon: <LayoutDashboard size={16} /> },
    { value: "proverb", label: t('sidebar.proverb', "Proverb"), icon: <Quote size={16} /> },
    { value: "bookmarks", label: t('sidebar.bookmarks', "Bookmarks"), icon: <Bookmark size={16} />, badge: bookmarks.length > 0 ? bookmarks.length : undefined },
    { value: "notifications", label: t('sidebar.notifications', "Notifications"), icon: <Bell size={16} />, badge: unreadNotifications > 0 ? unreadNotifications : undefined }
  ];

  return (
    <MasterDashboardShell
      userRole="User"
      userName={computedName}
      userPhoto={auth.currentUser?.photoURL}
      activeTab={activeTab}
      sidebarLinks={userSidebarLinks}
      notificationCount={unreadNotifications}
      onNotificationClick={() => changePage("notifications", { fromPage: "dashboard" })}
      onLogout={triggerLogout}
      setActiveTab={(tabValue) => {
        if (tabValue === "bookmarks") {
          changePage("bookmarks");
        } else if (tabValue === "notifications") {
          changePage("notifications", { fromPage: "dashboard" });
        } else {
          setActiveTab(tabValue);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }}
    >
      <div className="space-y-10 animate-fadeIn">
        
        {/* WORD OF THE DAY BANNER */}
        {activeTab === "dashboard" && (
          <div className="relative w-full bg-gradient-to-r from-[#4A0C16] via-[#5C101C] to-[#4A0C16] text-white p-8 md:p-10 rounded-3xl shadow-xl overflow-hidden group border border-[#E09F26]/30">
            <div 
              className="absolute inset-0 opacity-[0.14] mix-blend-overlay bg-repeat"
              style={{ backgroundImage: `url(${okirPattern})`, backgroundSize: '240px' }}
            />
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-[#E09F26] to-[#D4A017] rounded-full blur-[100px] opacity-20 group-hover:opacity-40 transition-all duration-700 ease-in-out group-hover:scale-110"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={18} className="text-[#E09F26] animate-pulse" />
                  <p className="text-xs font-bold uppercase tracking-widest text-[#E09F26]">{t('userDashboard.wordOfDay', 'Word of the Day')}</p>
                </div>
                {word ? (
                  <>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-wide font-serif mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[#E09F26] via-[#FDF5E6] to-[#E09F26] drop-shadow-sm pb-1">
                      {word.term}
                    </h2>
                    <p className="text-base md:text-lg text-white/90 max-w-3xl leading-relaxed font-light border-l-2 border-[#E09F26]/50 pl-5">
                      {word.meaning}
                    </p>
                  </>
                ) : (
                  <p className="italic opacity-80">{t('userDashboard.noWord', 'Awaiting today’s cultural word...')}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* EXPLORER DASHBOARD VIEW (Cultural Items) */}
        {activeTab === "dashboard" && (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-2">
              <div className="relative flex-1 group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E09F26] transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder={t('userDashboard.searchPlaceholder', 'Search by title, description, or tags...')} 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className="w-full pl-14 pr-12 py-3.5 rounded-2xl border border-[#E09F26]/30 focus:outline-none focus:border-[#E09F26] focus:ring-4 focus:ring-[#E09F26]/10 shadow-sm bg-white text-sm font-medium text-[#4A0C16] transition-all" 
                />
                {search && (
                  <button 
                    onClick={() => setSearch("")} 
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#4A0C16] transition-colors p-1"
                    title="Clear search"
                  >
                    <X size={16} strokeWidth={3} />
                  </button>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 md:w-auto">
                <div className="relative w-full sm:w-48">
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)} 
                    className="w-full px-5 py-3.5 rounded-2xl border border-[#E09F26]/30 focus:outline-none focus:border-[#E09F26] focus:ring-4 focus:ring-[#E09F26]/10 shadow-sm bg-white cursor-pointer text-sm font-bold text-[#4A0C16] transition-all appearance-none uppercase tracking-wide"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234A0C16'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.2em' }}
                  >
                    <option value="all">{t('userDashboard.catAll', 'All Categories')}</option>
                    <option value="Artifact">{t('userDashboard.catArtifact', 'Artifact')}</option>
                    <option value="Publication">{t('userDashboard.catPublication', 'Publication')}</option>
                    <option value="Historical Records">{t('userDashboard.catHistorical', 'Historical Records')}</option>
                  </select>
                </div>

                <div className="relative w-full sm:w-48">
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)} 
                    className="w-full px-5 py-3.5 rounded-2xl border border-[#E09F26]/30 focus:outline-none focus:border-[#E09F26] focus:ring-4 focus:ring-[#E09F26]/10 shadow-sm bg-white cursor-pointer text-sm font-bold text-[#4A0C16] transition-all appearance-none uppercase tracking-wide"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234A0C16'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.2em' }}
                  >
                    <option value="newest">{t('userDashboard.sortNewest', 'Newest First')}</option>
                    <option value="oldest">{t('userDashboard.sortOldest', 'Oldest First')}</option>
                    <option value="a-z">{t('userDashboard.sortAZ', 'Title A - Z')}</option>
                    <option value="z-a">{t('userDashboard.sortZA', 'Title Z - A')}</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="bg-white/80 mt-4 p-20 rounded-3xl text-center border border-[#E09F26]/20 flex flex-col items-center justify-center min-h-[350px]">
                <Search className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium text-base">{t('userDashboard.noItems', 'No cultural items found matching your search.')}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5 mt-4 animate-fadeIn">
                  {currentItems.map(item => {
                    const isBookmarked = bookmarks.includes(item.id);
                    return (
                      <div key={item.id} className="bg-white rounded-3xl overflow-hidden flex flex-col shadow-[0_4px_25px_rgba(74,12,22,0.02)] border border-[#E09F26]/20 hover:border-[#E09F26]/50 hover:shadow-xl transition-all duration-300 h-full group">
                        <div className="h-40 overflow-hidden relative shrink-0 bg-gray-50 border-b border-gray-100">
                          {item.imageUrl && !brokenImages[item.id] ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.title} 
                              onError={() => handleImageError(item.id)}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 text-[11px] font-medium tracking-wide uppercase bg-gray-50">
                              <BookOpen size={24} className="mb-1 opacity-20" />
                              {t('userDashboard.noImage', 'No Item Image')}
                            </div>
                          )}
                        </div>

                        <div className="p-4 flex flex-col flex-1 bg-white">
                          <div className="mb-3 flex-1">
                            <span className="inline-block px-2 py-0.5 bg-[#FEF9C3] text-[#4A0C16] text-[8px] font-black uppercase tracking-widest rounded border border-[#E09F26]/30 mb-1.5">
                              {item.category || t('userDashboard.uncategorized', 'Uncategorized')}
                            </span>
                            <h3 className="text-sm font-bold text-[#4A0C16] line-clamp-1 font-serif mb-0.5">{item.title}</h3>
                            <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed font-normal">{item.description}</p>
                          </div>

                          <div className="mt-auto flex gap-1.5">
                            <button 
                              onClick={() => changePage("itemdetail", { itemId: item.id, fromPage: "dashboard", role: "user" })} 
                              className="flex-1 bg-[#4A0C16] hover:bg-[#31080E] text-white py-2 rounded-xl text-xs font-bold transition-colors duration-200"
                            >
                              {t('userDashboard.viewBtn', 'Explore')}
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleBookmark(item); }} 
                              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all border ${
                                isBookmarked 
                                  ? "bg-[#E09F26] text-white border-[#E09F26] shadow-sm" 
                                  : "bg-white text-gray-400 border-gray-200 hover:bg-[#E09F26]/10 hover:text-[#E09F26] hover:border-[#E09F26]/30"
                              }`}
                            >
                              <Bookmark size={14} fill={isBookmarked ? "currentColor" : "none"} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="mt-10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white px-6 py-4 rounded-2xl border border-[#E09F26]/20 shadow-sm">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      {t('userDashboard.paginationShowing', 'Showing')} <span className="font-bold text-[#4A0C16]">{indexOfFirstItem + 1}</span> - <span className="font-bold text-[#4A0C16]">{Math.min(indexOfLastItem, filteredItems.length)}</span> {t('userDashboard.paginationOf', 'of')} <span className="font-bold text-[#4A0C16]">{filteredItems.length}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-[#4A0C16] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={16} strokeWidth={2.5} />
                      </button>
                      {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-8 h-8 rounded-xl font-bold text-xs ${
                            currentPage === pageNum ? "bg-[#4A0C16] text-white" : "bg-white border border-gray-200 text-[#4A0C16]"
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-[#4A0C16] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* WORKSPACE SHARED PROVERBS TAB SUB-VIEW PANEL */}
        {activeTab === "proverb" && (
          <div className="animate-fadeIn">
            <ProverbPosted 
                changePage={changePage} 
                role="user" 
                user={user}
                starredProverbs={starredProverbs}
                onToggleStar={toggleStarProverb}
            />
          </div>
        )}
      </div>

      {/* FLOATING ACTION BUTTON: FEEDBACK CHANNEL */}
      <button
        onClick={() => setIsFeedbackModalOpen(true)}
        className="fixed bottom-6 right-6 z-[40] bg-[#4A0C16] hover:bg-[#31080E] text-[#FDF5E6] p-4 rounded-full shadow-xl border border-[#E09F26] flex items-center justify-center transition-all duration-300 hover:scale-105"
        title={t('userDashboard.btnFeedback', 'Send System Feedback')}
      >
        <MessageSquare size={22} className="text-[#E09F26]" />
      </button>

      {/* SYSTEM FEEDBACK MODAL */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#FEF9C3] rounded-3xl border-2 border-[#E09F26] shadow-2xl max-w-lg w-full overflow-hidden relative">
            <div className="bg-[#4A0C16] px-6 py-5 flex items-center justify-between border-b border-[#E09F26]/30">
              <div className="flex items-center gap-2.5 text-white">
                <MessageSquare className="w-5 h-5 text-[#E09F26]" />
                <h3 className="font-serif font-bold text-lg text-[#FDF5E6]">{t('userDashboard.feedbackTitle', 'System Feedback')}</h3>
              </div>
              <button onClick={handleCloseFeedback} className="text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#4A0C16]">{t('userDashboard.feedbackCategory', 'Category')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: t('userDashboard.feedbackTypeComment', 'Comment'), value: "General Comment", icon: HelpCircle },
                    { label: t('userDashboard.feedbackTypeBug', 'Bug'), value: "Bug Report", icon: AlertTriangle },
                    { label: t('userDashboard.feedbackTypeSuggestion', 'Suggestion'), value: "Feature Suggestion", icon: Lightbulb }
                  ].map((type) => {
                    const IconComponent = type.icon;
                    const isSelected = feedbackType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFeedbackType(type.value)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                          isSelected ? "bg-[#4A0C16] border-[#4A0C16] text-white font-bold" : "bg-white border-[#E09F26]/30 text-gray-700"
                        }`}
                      >
                        <IconComponent size={16} className={isSelected ? "text-[#E09F26]" : "text-[#4A0C16] opacity-60"} />
                        <span className="text-[10px] uppercase font-bold tracking-wide mt-1">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <textarea
                  required
                  rows="4"
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder={t('userDashboard.feedbackPlaceholder', 'Describe your feedback details here...')}
                  className="w-full bg-white border border-[#E09F26]/30 rounded-2xl p-4 text-sm outline-none resize-none text-gray-800"
                  maxLength={1000}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={handleCloseFeedback} className="px-5 py-2.5 rounded-xl text-xs border border-[#E09F26]/40 text-[#4A0C16]">{t('userDashboard.btnCancel', 'Cancel')}</button>
                <button type="submit" disabled={isSubmittingFeedback} className="px-5 py-2.5 rounded-xl text-xs bg-[#4A0C16] text-white flex items-center justify-center min-w-[140px] gap-2">
                  {isSubmittingFeedback ? <Loader2 size={14} className="animate-spin" /> : t('userDashboard.btnSubmitFeedback', 'Submit Feedback')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UNIVERSAL CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden relative border border-[#E09F26]/30">
            <div className="p-6 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-[#FEF9C3] text-[#4A0C16] rounded-full flex items-center justify-center mb-4 border border-[#E09F26]/30">
                <AlertTriangle size={32} />
              </div>
              <h3 className="font-serif font-bold text-xl text-[#4A0C16] mb-2">
                {confirmModal.title}
              </h3>
              <p className="text-sm text-gray-600 mb-6 px-2">
                {confirmModal.message}
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {t('userDashboard.btnCancel', 'Cancel')}
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-[#4A0C16] text-white hover:bg-[#31080E] transition-colors shadow-lg shadow-[#4A0C16]/20"
                >
                  {t('userDashboard.btnConfirm', 'Confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MasterDashboardShell>
  );
};

export default UserDashboard;