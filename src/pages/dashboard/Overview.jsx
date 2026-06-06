import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { ArrowLeft, Search, Eye, Info, Lock } from "lucide-react";
import okirPattern from "../../assets/okir-pattern.png"; 

const Overview = ({ changePage }) => {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  const categories = ["All", "Artifact", "Historical Records", "Publication"];

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

        // ================= STRICT PREVIEW LIMITER =================
        const limitedList = [];
        const categoryCounts = {
          "artifact": 0,
          "historical records": 0,
          "publication": 0
        };

        // ONLY allow a maximum of 2 items per recognized category. No fillers!
        allItems.forEach((item) => {
          const rawCat = (item.category || "").toLowerCase().trim();
          
          if (categoryCounts[rawCat] !== undefined && categoryCounts[rawCat] < 2) {
            limitedList.push(item);
            categoryCounts[rawCat]++;
          }
        });

        // Sort the final strict list safely by newest
        limitedList.sort((a, b) => {
          const timeA = a.createdAt?.seconds 
            ? a.createdAt.seconds * 1000 
            : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
            
          const timeB = b.createdAt?.seconds 
            ? b.createdAt.seconds * 1000 
            : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
            
          return timeB - timeA; 
        });

        setItems(limitedList);

      } catch (error) {
        console.error("Fatal archive loading error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadApproved();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesSearch = (item.title || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || 
      (item.category || "").toLowerCase().trim() === selectedCategory.toLowerCase().trim();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#FEF9C3] text-gray-800 font-sans antialiased pb-16 flex flex-col">
      
      {/* HEADER WRAPPER STICKY CONTAINER */}
      <div className="w-full sticky top-0 z-50 shadow-2xl select-none">
        <div 
          className="w-full h-8" 
          style={{ 
            backgroundImage: `url(${okirPattern})`, 
            backgroundRepeat: 'repeat-x', 
            backgroundSize: 'auto 100%',
            backgroundPosition: 'center'
          }} 
          alt="Traditional Okir Pattern Strip"
        />
        
        <nav className="w-full bg-[#4A0C16] h-20 flex items-center px-6 md:px-12 border-b border-[#E09F26]/30 relative">
          <button
            onClick={() => changePage("landing")}
            className="group absolute left-4 md:left-8 bg-white/10 hover:bg-white/20 border border-[#E09F26]/30 text-white px-4 py-2 rounded-lg font-bold uppercase tracking-wide transition-all flex items-center gap-2 active:scale-95 text-sm"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="hidden md:inline">Back</span>
          </button>
          
          <div className="w-full text-center">
            <h1 className="text-xl md:text-2xl font-bold font-serif tracking-wider text-white">
              Public Archive Preview
            </h1>
            <p className="text-xs md:text-sm text-[#E09F26] font-semibold tracking-widest uppercase mt-0.5">
              Guest Access Mode
            </p>
          </div>
        </nav>
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-[1400px] w-full mx-auto px-6 md:px-12 mt-8 flex-1">
        
        <div className="mb-10">
          <div className="bg-white p-4 rounded-xl border border-[#E09F26] shadow-md flex items-start gap-4 mb-8">
            <div className="bg-[#FEF9C3] p-2 rounded-full text-[#E09F26] flex-shrink-0 mt-0.5">
              <Info size={24} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#4A0C16] text-lg">Limited Preview Mode</h3>
              <p className="text-gray-600 text-sm leading-relaxed mt-1">
                You are viewing a limited sample database containing up to 2 items per category. To search, view, and read the entire cultural collection without restrictions, please log in or create an account.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Search preview items..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-[#E09F26]/30 focus:border-[#4A0C16] outline-none shadow-sm bg-white text-sm font-medium transition" 
              />
            </div>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)} 
              className="px-5 py-3 rounded-lg border border-[#E09F26]/30 focus:border-[#4A0C16] outline-none bg-white min-w-[220px] shadow-sm cursor-pointer text-sm font-bold uppercase tracking-wide text-[#4A0C16] transition"
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>

        {/* ITEMS DISPLAY */}
        <div>
          <div className="flex justify-between items-end mb-6 border-b border-[#E09F26]/30 pb-4">
            <h2 className="text-2xl font-serif font-bold text-[#4A0C16]">
              {selectedCategory === "All" ? "Curated Sample" : `${selectedCategory} Previews`}
            </h2>
            <p className="text-[#E09F26] text-sm font-bold uppercase tracking-widest">
              {filteredItems.length} Items Displayed
            </p>
          </div>
    
          {loading ? (
            <div className="text-center py-20 text-[#4A0C16] font-bold animate-pulse font-serif text-xl">
              Retrieving Cultural Archives...
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-[#E09F26]/30 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 h-full group"
                >
                  <div className="h-56 overflow-hidden bg-gray-100 relative">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                        alt={item.title}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400 uppercase tracking-widest bg-gray-200">
                        No Media
                      </div>
                    )}
                  </div>
    
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl font-serif font-bold text-[#4A0C16] line-clamp-1 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#E09F26] font-sans font-semibold tracking-widest uppercase mb-4">
                      {item.category || "General"}
                    </p>
                    
                    <p className="text-gray-600 text-sm line-clamp-3 mb-6 leading-relaxed flex-grow">
                      {item.description || "No description available for this preview item."}
                    </p>
                    
                    <button
                      onClick={() => changePage("itemdetail", { itemId: item.id, fromPage: "overview" })}
                      className="mt-auto w-full bg-white hover:bg-[#4A0C16] text-[#4A0C16] hover:text-white border border-[#4A0C16] py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-sm"
                    >
                      <Eye size={18} />
                      View Details
                    </button>
                  </div>
                </div>
              ))}

              {/* BLURRED LOGIN CALL-TO-ACTION CARD */}
              <div
                onClick={() => changePage("login")}
                className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-[#E09F26]/30 relative cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 h-full group min-h-[420px]"
              >
                <div className="h-56 bg-gray-200 opacity-40"></div>
                <div className="p-6 opacity-30 flex flex-col flex-1">
                  <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/4 mb-6"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mt-auto"></div>
                </div>

                <div className="absolute inset-0 bg-white/40 backdrop-blur-[6px] flex flex-col items-center justify-center text-center p-6 transition-all duration-300 group-hover:bg-white/20">
                  <div className="bg-[#4A0C16] text-white p-4 rounded-full shadow-xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Lock size={32} />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-[#4A0C16] mb-2">
                    Unlock Archive
                  </h3>
                  <p className="text-sm text-gray-800 font-medium mb-6 px-2">
                    Log in or register to browse hundreds of cultural items, documents, and rich histories.
                  </p>
                  <button className="bg-[#E09F26] text-white px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide shadow-md group-hover:bg-[#c78b20] transition-colors">
                    Sign In to Explore
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Overview;