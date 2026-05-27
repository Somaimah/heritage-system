import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import { Quote, Search, Inbox, ChevronLeft, ChevronRight, Filter, Star } from "lucide-react";

const SharedPublishedProverbs = ({ changePage, role, starredProverbs = [], onToggleStar }) => {
  const [proverbs, setProverbs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All"); 
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 10; 

  const categories = ["All", "Wisdom", "Relationships & Community", "Honor & Respect", "General Life Lessons"];

  useEffect(() => {
    const q = query(collection(db, "proverb"));
    const unsub = onSnapshot(q, (snapshot) => {
      const allProverbs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const published = allProverbs.filter(item => {
        const stat = (item.status || "").toLowerCase();
        return stat === "validated" || stat === "posted";
      });
      setProverbs(published);
    }, (error) => console.error("Error fetching proverbs:", error));

    return () => unsub();
  }, []);

  // Filter and SORT: Starred items jump to the top
  const filteredAndSortedProverbs = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    const filtered = proverbs.filter(item => {
      const itemCategory = item.category || "General Life Lessons";
      const matchesCategory = selectedCategory === "All" || itemCategory === selectedCategory;
      const matchesSearch = !normalizedQuery || 
        (item.proverb || "").toLowerCase().includes(normalizedQuery) || 
        (item.meaning || "").toLowerCase().includes(normalizedQuery) ||
        itemCategory.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });

    return filtered.sort((a, b) => {
      const aStarred = starredProverbs.includes(a.id);
      const bStarred = starredProverbs.includes(b.id);
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;
      return 0;
    });
  }, [proverbs, searchQuery, selectedCategory, starredProverbs]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredAndSortedProverbs.length / itemsPerPage) || 1;
  const paginatedItems = filteredAndSortedProverbs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="w-full animate-fadeIn p-4 md:p-8 max-w-7xl mx-auto">
      
      {/* 🔍 SEARCH & DROPDOWN */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search traditional wisdom..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-[#E09F26]/30 focus:outline-none focus:border-[#E09F26] focus:ring-4 focus:ring-[#E09F26]/10 shadow-sm bg-white text-sm font-medium text-[#4A0C16] transition-all" 
          />
        </div>

        <div className="relative min-w-[240px]">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E09F26]" size={16} />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-11 pr-10 py-4 bg-white rounded-2xl border border-[#E09F26]/30 appearance-none focus:outline-none focus:border-[#E09F26] focus:ring-4 focus:ring-[#E09F26]/10 text-sm font-bold text-[#4A0C16] shadow-sm cursor-pointer transition-all"
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat === "All" ? "All Proverb Kinds" : cat}</option>)}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 font-bold text-xs">▼</div>
        </div>
      </div>

      {/* 🏛️ GRID */}
      {paginatedItems.length === 0 ? (
        <div className="bg-white/60 p-16 rounded-3xl text-center border border-[#E09F26]/15 flex flex-col items-center">
          <Inbox className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium text-lg">No proverbs found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {paginatedItems.map(item => {
            const isStarred = starredProverbs.includes(item.id);
            return (
              <div 
                key={item.id} 
                onClick={() => changePage("proverbdetail", { itemId: item.id, fromPage: "proverb", role: role || "user" })} 
                className="bg-white rounded-2xl flex flex-col shadow-sm border border-[#E09F26]/20 hover:border-[#E09F26]/80 hover:shadow-lg transition-all duration-300 h-[220px] p-6 cursor-pointer group relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-4 mb-3 shrink-0 relative z-20">
                  <span className="text-[10px] text-[#A16207] bg-[#FEF9C3] font-black uppercase tracking-widest px-2.5 py-1 rounded border border-[#FEF08A] truncate max-w-[80%]">
                    {item.category || "General Life Lessons"}
                  </span>

                  {/* ⭐ STAR BUTTON - FIXED CLICKABILITY */}
                  {role === "user" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation(); // CRITICAL: Stops the card's onClick from firing
                        if (onToggleStar) onToggleStar(item);
                      }}
                      className={`relative z-[100] p-2 rounded-xl transition-all border shadow-sm active:scale-95 ${
                        isStarred 
                          ? "bg-[#E09F26] text-white border-[#E09F26]" 
                          : "bg-white text-gray-400 border-gray-100 hover:border-[#E09F26]/50 hover:text-[#E09F26]"
                      }`}
                    >
                      <Star 
                        size={18} 
                        fill={isStarred ? "currentColor" : "none"} 
                        strokeWidth={2.5} 
                        className="pointer-events-none" // Ensures click passes to the button
                      />
                    </button>
                  )}
                </div>

                <div className="flex gap-4 items-start flex-1 overflow-hidden pointer-events-none">
                  <Quote size={28} className="text-[#E09F26] mt-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="flex flex-col gap-2 w-full">
                    <h3 className="text-xl font-black text-[#4A0C16] italic font-serif line-clamp-2 leading-snug">
                      "{item.proverb || item.title}"
                    </h3>
                    {item.meaning && <p className="text-sm text-gray-500 line-clamp-2 font-medium leading-relaxed">{item.meaning}</p>}
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t border-gray-50 text-right shrink-0 pointer-events-none">
                   <span className="text-[10px] font-bold text-[#E09F26] uppercase tracking-wider group-hover:text-[#4A0C16] transition-colors">
                     Read Full Detail &rarr;
                   </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {filteredAndSortedProverbs.length > itemsPerPage && (
        <div className="mt-12 flex items-center justify-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-2.5 bg-white border rounded-xl disabled:opacity-40"><ChevronLeft size={18}/></button>
          <span className="text-sm font-bold text-[#4A0C16]">Page {currentPage} of {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-2.5 bg-white border rounded-xl disabled:opacity-40"><ChevronRight size={18}/></button>
        </div>
      )}
    </div>
  );
};

export default SharedPublishedProverbs;