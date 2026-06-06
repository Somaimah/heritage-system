import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { db, auth } from "../firebase/firebase";
import { collection, query, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { useSystemData } from "../hooks/useSystemData";
import { 
  ArrowLeft, Trash2, Eye, ImageOff, BookmarkX, Loader2, Search, Filter 
} from "lucide-react"; 

import okirPattern from "../assets/okir-pattern.png";

const BookmarkPage = ({ changePage }) => {
  const { t } = useTranslation(); 
  const { culturalItems } = useSystemData("user");
  
  const [bookmarkLinks, setBookmarkLinks] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // 1. Sync Bookmark IDs
  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "bookmarks"), where("userId", "==", auth.currentUser.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setBookmarkLinks(snapshot.docs.map(d => ({ id: d.id, itemId: d.data().itemId })));
      setLoading(false); 
    }, (err) => {
      console.error("Bookmark sync error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Match IDs with Full Data
  const fullBookmarks = useMemo(() => {
    return bookmarkLinks.map(link => {
      const fullData = culturalItems.find(item => item.id === link.itemId);
      return {
        bookmarkDocId: link.id, // For deletion
        id: link.itemId, // For navigation
        ...(fullData || { title: t("bookmarks.unavailable", "Item Unavailable"), category: "Unknown", tags: [], description: "" })
      };
    });
  }, [bookmarkLinks, culturalItems, t]);

  // 3. Filter & Search
  const filteredBookmarks = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    return fullBookmarks.filter(item => {
      const matchesSearch = !normalizedQuery || 
        (item.title || "").toLowerCase().includes(normalizedQuery) ||
        (item.description || "").toLowerCase().includes(normalizedQuery) ||
        (Array.isArray(item.tags) && item.tags.some(tag => tag.toLowerCase().includes(normalizedQuery)));

      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [fullBookmarks, searchQuery, selectedCategory]);

  // 4. Extract categories from the actual matched data
  const categories = useMemo(() => {
    const cats = new Set(fullBookmarks.map(b => b.category).filter(Boolean));
    return ["all", ...Array.from(cats)];
  }, [fullBookmarks]);

  const removeBookmark = async (bookmarkDocId) => {
    try {
      await deleteDoc(doc(db, "bookmarks", bookmarkDocId));
    } catch (error) {
      console.error("Error removing bookmark:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FEF9C3] text-gray-800 font-sans antialiased flex flex-col pb-20 animate-fadeIn">
      <header className="bg-[#4A0C16]/95 backdrop-blur-md text-white shadow-lg sticky top-0 z-50 border-b border-[#E09F26]/40 flex flex-col">
        <div className="w-full h-8 bg-repeat-x bg-center border-b border-[#E09F26]/20 bg-[#4A0C16]" style={{ backgroundImage: `url(${okirPattern})`, backgroundSize: 'auto 32px' }} />
        <div className="px-6 lg:px-10 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-wide font-serif text-[#FDF5E6]">{t("bookmarks.title", "Bookmarks")}</h1>
            <p className="text-xs tracking-widest text-[#E09F26] uppercase font-semibold">Your Curated Heritage</p>
          </div>
          <button onClick={() => changePage("dashboard")} className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition duration-300 text-sm">
            <ArrowLeft size={18} className="text-[#E09F26]" /> <span>Back to Dashboard</span>
          </button>
        </div>
      </header>

      <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        {!loading && bookmarkLinks.length > 0 && (
          <div className="flex flex-col md:flex-row gap-4 mb-10">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E09F26] transition-colors" size={20} />
              <input type="text" placeholder="Search saved items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-[#E09F26]/20 bg-white focus:border-[#E09F26] focus:ring-4 focus:ring-[#E09F26]/5 outline-none transition-all text-sm font-medium shadow-sm" />
            </div>
            <div className="relative min-w-[200px]">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E09F26]" size={18} />
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-[#E09F26]/20 bg-white appearance-none cursor-pointer text-sm font-bold text-[#4A0C16] focus:border-[#E09F26] outline-none shadow-sm" >
                {categories.map(cat => <option key={cat} value={cat}>{cat === "all" ? "All Categories" : cat}</option>)}
              </select>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32"><Loader2 className="w-12 h-12 text-[#4A0C16] animate-spin" /></div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm p-20 rounded-3xl text-center border border-[#E09F26]/20 max-w-2xl mx-auto flex flex-col items-center">
            <BookmarkX className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium italic">{bookmarkLinks.length === 0 ? t("bookmarks.noBookmarks", "No items saved.") : "No matches found."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 animate-fadeIn">
            {filteredBookmarks.map((item) => (
              <div key={item.bookmarkDocId} className="bg-white rounded-3xl overflow-hidden flex flex-col shadow-sm border border-[#E09F26]/30 hover:border-[#E09F26]/60 hover:-translate-y-1.5 transition-all duration-400 group">
                <div className="h-52 overflow-hidden relative shrink-0 bg-gray-50 border-b">
                  {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.title} /> : <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50"><ImageOff size={32} className="mb-2 opacity-20" /><span className="text-xs">No Image</span></div>}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="mb-5">
                    <span className="inline-block px-2.5 py-1 bg-[#FEF9C3] text-[#4A0C16] text-[10px] font-black uppercase tracking-widest rounded-md mb-3 border border-[#E09F26]/40">{item.category}</span>
                    <h3 className="text-lg font-bold text-[#4A0C16] line-clamp-2 font-serif mb-2 leading-tight min-h-[3rem]">{item.title}</h3>
                  </div>
                  <div className="mt-auto flex gap-3">
                    <button onClick={() => changePage("itemdetail", { itemId: item.id, fromPage: "bookmarks" })} className="flex-1 bg-[#4A0C16] text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"><Eye size={14} /> {t("bookmarks.viewBtn", "View")}</button>
                    <button onClick={() => removeBookmark(item.bookmarkDocId)} className="w-11 h-11 flex items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookmarkPage;