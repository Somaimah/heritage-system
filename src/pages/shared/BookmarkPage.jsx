import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { db, auth } from "../../firebase/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  getDoc
} from "firebase/firestore";
import { ArrowLeft, Trash2, Eye, ImageOff, BookmarkX, Loader2 } from "lucide-react"; 

// Imported Okir pattern asset for visual branding continuity
import okirPattern from "../../assets/okir-pattern.png";

const BookmarkPage = ({ changePage }) => {
  const { t } = useTranslation(); 
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

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

          if (!item.imageUrl) {
            const itemRef = doc(db, "culturalItems", item.itemId);
            const itemSnap = await getDoc(itemRef);

            if (itemSnap.exists()) {
              return {
                id: d.id,
                ...item,
                imageUrl: itemSnap.data().imageUrl || ""
              };
            }
          }
          return { id: d.id, ...item };
        })
      );
      setBookmarks(data);
      setLoading(false); 
    });

    return () => unsub();
  }, []);

  const removeBookmark = async (id) => {
    try {
      await deleteDoc(doc(db, "bookmarks", id));
    } catch (error) {
      console.error("Error removing bookmark:", error);
    }
  };

  return (
    /* ROOT VISUAL BACKDROP */
    <div className="min-h-screen bg-[#FEF9C3] text-gray-800 font-sans antialiased selection:bg-[#4A0C16]/20 selection:text-[#4A0C16] flex flex-col pb-20 animate-fadeIn">
      
      {/* 👑 HIGH-END STICKY NAVBAR WITH INTEGRATED OKIR PATTERN */}
      <header className="bg-[#4A0C16]/95 backdrop-blur-md text-white shadow-lg sticky top-0 z-50 border-b border-[#E09F26]/40 flex flex-col transition-all duration-300">
        
        {/* 🌟 INTEGRATED OKIR BANNER - Proudly matches the dashboard top row */}
        <div 
          className="w-full h-8 bg-repeat-x bg-center border-b border-[#E09F26]/20 bg-[#4A0C16]"
          style={{ 
            backgroundImage: `url(${okirPattern})`, 
            backgroundSize: 'auto 32px' 
          }}
        />

        {/* MAIN NAVIGATION ROW */}
        <div className="px-6 lg:px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-wide font-serif text-[#FDF5E6]">
                {t("bookmarks.title", "Bookmarks")}
              </h1>
              <p className="text-xs tracking-widest text-[#E09F26] uppercase font-semibold">Saved Collections</p>
            </div>
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

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        
        {/* ================= LOADING STATE ================= */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-12 h-12 text-[#4A0C16] animate-spin" />
          </div>
        ) : (
          <>
            {/* ================= EMPTY STATE ================= */}
            {bookmarks.length === 0 && (
              <div className="bg-white/60 backdrop-blur-sm p-20 rounded-3xl shadow-sm text-center border border-[#E09F26]/20 flex flex-col items-center justify-center max-w-2xl mx-auto">
                <BookmarkX className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium text-lg italic">
                  {t("bookmarks.noBookmarks", "No bookmarks found.")}
                </p>
              </div>
            )}

            {/* ================= ITEMS RENDERING GRID ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 animate-fadeIn">
              {bookmarks.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl overflow-hidden flex flex-col shadow-[0_4px_25px_rgba(74,12,22,0.03)] border border-[#E09F26]/30 hover:border-[#E09F26]/60 hover:shadow-[0_20px_40px_-10px_rgba(74,12,22,0.15)] hover:-translate-y-1.5 transition-all duration-400 h-full group"
                >
                  {/* CARD IMAGE CONTAINER */}
                  <div className="h-52 overflow-hidden relative shrink-0 bg-gray-50 border-b border-gray-100">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        alt={item.title}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 text-sm font-medium bg-gray-50">
                        <ImageOff size={32} className="mb-2 opacity-20" />
                        <span>No Image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#4A0C16]/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* CARD CONTENT WRAPPER */}
                  <div className="p-6 flex flex-col flex-1 bg-white relative z-10">
                    <div className="mb-5">
                      <span className="inline-block px-2.5 py-1 bg-[#FEF9C3] text-[#4A0C16] text-[10px] font-bold uppercase tracking-widest rounded-md mb-3 border border-[#E09F26]/40">
                        {item.category || "Cultural Item"}
                      </span>
                      <h3 className="text-xl font-bold text-[#4A0C16] line-clamp-2 font-serif mb-2 leading-tight min-h-[3.5rem]">
                        {item.title || "Untitled Item"}
                      </h3>
                    </div>

                    {/* ACTION BUTTONS FOOTER */}
                    <div className="mt-auto flex gap-3">
                      <button
                        onClick={() =>
                          changePage("itemdetail", {
                            itemId: item.itemId,
                            fromPage: "bookmarks"
                          })
                        }
                        className="flex-1 bg-[#4A0C16] hover:bg-[#31080E] text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-[#E09F26]/20 shadow-[0_4px_15px_rgba(74,12,22,0.2)] hover:shadow-[0_6px_20px_rgba(224,159,38,0.3)] transition-all duration-300"
                      >
                        <Eye size={16} /> {t("bookmarks.viewBtn", "View")}
                      </button>

                      <button
                        onClick={() => removeBookmark(item.id)}
                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-300 shadow-sm"
                        title={t("bookmarks.removeBtn", "Remove")}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BookmarkPage;