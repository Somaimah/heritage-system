import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { ArrowLeft, Search, Eye, Info } from "lucide-react";

const Overview = ({ changePage }) => {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadApproved = async () => {
      try {
        const q = query(
          collection(db, "culturalItems"),
          where("status", "==", "posted")
        );

        const snapshot = await getDocs(q);

        const allItems = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // ================= PREVIEW LIMITER LOGIC =================
        // Strictly limit to 2 items per category for the Guest View
        const limitedList = [];
        const categoryCounts = {
          "Artifact": 0,
          "Historical Records": 0,
          "Publication": 0
        };

        allItems.forEach((item) => {
          const cat = item.category;
          if (categoryCounts[cat] !== undefined && categoryCounts[cat] < 2) {
            limitedList.push(item);
            categoryCounts[cat]++;
          }
        });

        setItems(limitedList);
      } catch (error) {
        console.error("Error loading items:", error);
      } finally {
        setLoading(false);
      }
    };

    loadApproved();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#f5f5dc] font-sans pb-10">
  
      {/* HEADER SECTION */}
      <div className="bg-[#800000] text-white py-12 px-6 text-center relative shadow-md">
        <button
          onClick={() => changePage("landing")}
          className="absolute left-4 top-4 md:left-8 md:top-8 bg-white text-[#800000] px-4 py-2 rounded-lg font-bold shadow hover:bg-gray-100 transition flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          <span className="hidden md:inline">Back to Home</span>
        </button>
        <h1 className="text-3xl md:text-4xl font-bold mb-2 font-serif">
          Cultural Heritage Archive
        </h1>
        <p className="text-gray-200">
          Explore Meranaw cultural collections (Guest Preview)
        </p>
      </div>
  
      {/* MAIN CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* SEARCH & FILTER UI */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-[#800000]">Browse Archive</h2>
            
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search items by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent transition"
              />
            </div>
          </div>
    
          {/* Category Buttons */}
          <div className="flex gap-2 flex-wrap mb-6">
            {["All", "Artifact", "Historical Records", "Publication"].map((category, index) => (
              <button
                key={index}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition shadow-sm border ${
                  selectedCategory === category 
                    ? "bg-[#800000] text-white border-[#800000]" 
                    : "bg-white text-gray-600 border-gray-300 hover:border-[#800000] hover:text-[#800000]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
    
          {/* Guest Notice */}
          <div className="bg-[#fff8dc] p-4 rounded-xl border border-[#D4A017] flex items-start gap-3">
            <Info className="text-[#D4A017] flex-shrink-0 mt-0.5" size={20} />
            <p className="text-[#800000] text-sm">
              <strong>Guest Access Notice:</strong> You are viewing a limited sample database containing up to 2 items per category. Please login or register to search, view, and read the entire cultural collection.
            </p>
          </div>
        </div>
  
        {/* ITEMS DISPLAY */}
        <div>
          <p className="text-gray-600 mb-4 font-medium px-2">
            Showing {filteredItems.length} preview items
          </p>
    
          {loading ? (
            <div className="text-center py-20 text-gray-500 animate-pulse font-semibold">
              Loading Archive Preview...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center text-gray-500 shadow-sm border border-gray-200">
              No preview items found matching your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-gray-100 flex flex-col h-[420px]"
                >
                  {/* Image Section */}
                  <div
                    className="h-48 w-full bg-cover bg-center"
                    style={{
                      backgroundImage: item.imageUrl 
                        ? `url(${item.imageUrl})` 
                        : "linear-gradient(to right, #800000, #D4A017)"
                    }}
                  />
    
                  {/* Content Section */}
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-gray-100 text-[#800000] text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                        {item.category}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                      {item.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                      {item.description || "No description available for this item."}
                    </p>
                    
                    {/* View Button - Always pushed to the bottom of the card */}
                    <button
                      onClick={() => changePage("itemdetail", { itemId: item.id, fromPage: "overview" })}
                      className="mt-auto w-full bg-gray-50 hover:bg-[#800000] text-[#800000] hover:text-white border border-gray-200 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Eye size={18} />
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Overview;