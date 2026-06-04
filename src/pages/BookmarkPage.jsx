import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { db, auth } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  getDoc
} from "firebase/firestore";
import { 
  ArrowLeft, Trash2, Eye, ImageOff, BookmarkX, Loader2, Search, Filter 
} from "lucide-react"; 

import okirPattern from "../../assets/okir-pattern.png";

const BookmarkPage = ({ changePage }) => {
  const { t } = useTranslation(); 
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "bookmarks"),
      where("userId", "==", auth.currentUser.uid)
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const data = await Promise.all(
        snapshot.docs.map(async (d) => {
          const item = d.data();
          
          // If the bookmark doesn't have full data (like tags or description), 
          // we fetch the latest from culturalItems to ensure search works on metadata
          const itemRef = doc(db, "culturalItems", item.itemId);
          const itemSnap = await getDoc(itemRef);

          if (itemSnap.exists()) {
            const fullData = itemSnap.data();
            return {
              id: d.id,
              ...item,
              // Merge latest data for accurate filtering/searching
              title: fullData.title || item.title,
              category: fullData.category || item.category,
              imageUrl: fullData.imageUrl || item.imageUrl,
              tags: fullData.tags || [],
              description: fullData.description || ""
            };
          }
          return { id: d.id, ...item, tags: [] };
        })
      );
      setBookmarks(data);
      setLoading(false); 
    });

    return () => unsub();
  }, []);

  // ================= FILTER & SEARCH LOGIC =================
  const filteredBookmarks = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    return bookmarks.filter(item => {
      // Metadata Tag Match
      const hasTagMatch = Array.isArray(item.tags) && 
        item.tags.some(tag => tag.toLowerCase().includes(normalizedQuery));
      
      const matchesSearch = !normalizedQuery || 
        (item.title || "").toLowerCase().includes(normalizedQuery) ||
        (item.description || "").toLowerCase().includes(normalizedQuery) ||
        hasTagMatch;

      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [bookmarks, searchQuery, selectedCategory]);

  // Extract unique categories for the filter dropdown
  const categories = useMemo(() => {
    const cats = new Set(bookmarks.map(b => b.category).filter(Boolean));
    return ["all", ...Array.from(cats)];
  }, [bookmarks]);

  const removeBookmark = async (id) => {
    try {
      await deleteDoc(doc(db, "bookmarks", id));
    } catch (error) {
      console.error("Error removing bookmark:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FEF9C3] text-gray-800 font-sans antialiased flex flex-col pb-20 animate-fadeIn">
      
      <header className="bg-[#4A0C16]/95 backdrop-blur-md text-white shadow-lg sticky top-0 z-50 border-b border-[#E09F26]/40 flex flex-col">
        <div 
          className="w-full h-8 bg-repeat-x bg-center border-b border-[#E09F26]/20 bg-[#4A0C16]"
          style={{ backgroundImage: `url(${okirPattern})`, backgroundSize: 'auto 32px' }}
        />
        <div className="px-6 lg:px-10 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-wide font-serif text-[#FDF5E6]">
              {t("bookmarks.title", "Bookmarks")}
            </h1>
            <p className="text-xs tracking-widest text-[#E09F26] uppercase font-semibold">Your Curated Heritage</p>
          </div>
          <button
            onClick={() => changePage("dashboard")}
            className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition duration-300 text-sm"
          >
            <ArrowLeft size={18} className="text-[#E09F26]" /> 
            <span>Back to Dashboard</span>
          </button>
        </div>
      </header>

      <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        
        {/* 🔍 SEARCH & FILTER BAR */}
        {!loading && bookmarks.length > 0 && (
          <div className="flex flex-col md:flex-row gap-4 mb-10">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E09F26] transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search by title, description, or metadata tags..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-[#E09F26]/20 bg-white focus:border-[#E09F26] focus:ring-4 focus:ring-[#E09F26]/5 outline-none transition-all text-sm font-medium shadow-sm"
              />
            </div>
            <div className="relative min-w-[200px]">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E09F26]" size={18} />
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-[#E09F26]/20 bg-white appearance-none cursor-pointer text-sm font-bold text-[#4A0C16] focus:border-[#E09F26] outline-none shadow-sm"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-12 h-12 text-[#4A0C16] animate-spin" />
          </div>
        ) : (
          <>
            {filteredBookmarks.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-sm p-20 rounded-3xl shadow-sm text-center border border-[#E09F26]/20 flex flex-col items-center justify-center max-w-2xl mx-auto">
                <BookmarkX className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium text-lg italic">
                  {bookmarks.length === 0 
                    ? t("bookmarks.noBookmarks", "You haven't saved any items yet.") 
                    : "No items match your current search criteria."}
                </p>
                {bookmarks.length > 0 && (
                  <button onClick={() => {setSearchQuery(""); setSelectedCategory("all");}} className="mt-4 text-[#4A0C16] font-bold text-sm underline underline-offset-4">
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 animate-fadeIn">
                {filteredBookmarks.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl overflow-hidden flex flex-col shadow-sm border border-[#E09F26]/30 hover:border-[#E09F26]/60 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-400 group"
                  >
                    <div className="h-52 overflow-hidden relative shrink-0 bg-gray-50 border-b">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          alt={item.title}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                          <ImageOff size={32} className="mb-2 opacity-20" />
                          <span className="text-xs">No Image Available</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#4A0C16]/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <div className="p-6 flex flex-col flex-1 bg-white">
                      <div className="mb-5">
                        <span className="inline-block px-2.5 py-1 bg-[#FEF9C3] text-[#4A0C16] text-[10px] font-black uppercase tracking-widest rounded-md mb-3 border border-[#E09F26]/40">
                          {item.category || "General"}
                        </span>
                        <h3 className="text-lg font-bold text-[#4A0C16] line-clamp-2 font-serif mb-2 leading-tight min-h-[3rem]">
                          {item.title || "Untitled Item"}
                        </h3>
                      </div>

                      <div className="mt-auto flex gap-3">
                        <button
                          onClick={() => changePage("itemdetail", { itemId: item.itemId, fromPage: "bookmarks" })}
                          className="flex-1 bg-[#4A0C16] hover:bg-[#31080E] text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                        >
                          <Eye size={14} /> {t("bookmarks.viewBtn", "View")}
                        </button>

                        <button
                          onClick={() => removeBookmark(item.id)}
                          className="w-11 h-11 flex items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                          title={t("bookmarks.removeBtn", "Remove")}
                        >
                          <Trash2 size={16} />
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

export default BookmarkPage;