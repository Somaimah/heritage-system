import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { Search, BookOpen, ChevronLeft, ChevronRight, Layers } from "lucide-react";

const SharedPostedItems = ({ changePage, role }) => {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // Only fetch items that are officially "posted"
    const q = query(collection(db, "culturalItems"), where("status", "==", "posted"));
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = filteredItems.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Search Header */}
      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E09F26] transition-colors" size={16} />
        <input 
          type="text" 
          placeholder="Search published assets..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#E09F26]/20 focus:outline-none focus:border-[#E09F26] shadow-sm bg-white text-sm" 
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="bg-white/60 p-16 rounded-3xl text-center border border-[#E09F26]/10">
          <Layers className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No published cultural items found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {currentItems.map(item => (
            <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-[#E09F26]/20 hover:shadow-md transition-all group">
              <div className="h-32 bg-gray-50 border-b border-gray-100 relative overflow-hidden">
                {item.imageUrl ? (
                  <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300"><BookOpen size={20} /></div>
                )}
              </div>
              <div className="p-3">
                <span className="text-[8px] font-black uppercase tracking-widest text-[#E09F26] bg-[#FEF9C3] px-1.5 py-0.5 rounded">{item.category}</span>
                <h3 className="text-xs font-bold text-[#4A0C16] mt-1 line-clamp-2 font-serif">{item.title}</h3>
                <button 
                  onClick={() => changePage("itemdetail", { itemId: item.id, fromPage: "dashboard", role })}
                  className="w-full mt-3 bg-[#4A0C16] text-white py-1.5 rounded-lg text-[10px] font-bold hover:bg-[#31080E] transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredItems.length > itemsPerPage && (
        <div className="flex items-center justify-between pt-4 border-t border-[#E09F26]/10">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 rounded-xl bg-white border border-[#E09F26]/30 disabled:opacity-40"><ChevronLeft size={16} /></button>
          <span className="text-xs font-bold font-mono">Page {currentPage} / {Math.ceil(filteredItems.length / itemsPerPage)}</span>
          <button disabled={indexOfLastItem >= filteredItems.length} onClick={() => setCurrentPage(p => p + 1)} className="p-2 rounded-xl bg-white border border-[#E09F26]/30 disabled:opacity-40"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
};

export default SharedPostedItems;