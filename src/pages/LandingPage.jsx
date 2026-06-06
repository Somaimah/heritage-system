import React, { useState, useEffect, useMemo } from "react";
import { Search, BookOpen, History, Shield, ArrowRight } from "lucide-react";
import Navbar from "../components/Navbar"; 
import { useSystemData } from "../hooks/useSystemData"; // ✅ Integrated hook

// Hero Assets
import mchcBuilding from "../assets/mchc-building.jpg";
import mchcBuilding2 from "../assets/mchc-building-2.jpg";
import mchcBuilding3 from "../assets/mchc-building-3.jpg";
import okirPattern from "../assets/okir-pattern.png";

const LandingPage = ({ changePage }) => {
  const { culturalItems } = useSystemData("guest"); // Using hook

  // 1. Hero Slideshow State
  const heroImages = [mchcBuilding, mchcBuilding2, mchcBuilding3];
  const [heroIndex, setHeroIndex] = useState(0);

  // 2. Derive Featured Items from Global State
  const featuredItems = useMemo(() => {
    return culturalItems.filter(item => item.isFeatured && item.status === "posted");
  }, [culturalItems]);

  // Hero Image Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  // Fetch Featured Items from Firestore
  useEffect(() => {
    const fetchFeaturedItems = async () => {
      try {
        const q = query(
          collection(db, "culturalItems"), 
          where("isFeatured", "==", true),
          where("status", "==", "posted")
        );
        
        const querySnapshot = await getDocs(q);
        const itemsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setFeaturedItems(itemsList);
      } catch (error) {
        console.error("Error fetching featured items:", error);
      }
    };

    fetchFeaturedItems();
  }, []);

  return (
    <div className="min-h-screen bg-[#FEF9C3] animate-fadeIn flex flex-col">
      
      {/* 1. NAVBAR WITH INTEGRATED OKIR BANNER */}
      <header className="sticky top-0 z-50 flex flex-col shadow-lg transition-all duration-300">
        <div 
          className="w-full h-8 bg-repeat-x bg-center border-b border-[#E09F26]/20 bg-[#4A0C16]"
          style={{ 
            backgroundImage: `url(${okirPattern})`, 
            backgroundSize: 'auto 32px' 
          }}
        />
        <Navbar changePage={changePage} />
      </header>

      {/* 2. FULLSCREEN HERO SECTION */}
      <section className="relative w-full h-[85vh] bg-[#1a1a1a] overflow-hidden">
        <div className="absolute inset-0 z-0">
          {heroImages.map((imgSrc, idx) => (
            <img 
              key={idx}
              src={imgSrc} 
              alt={`MSU Cultural Heritage Center View ${idx + 1}`} 
              className={`absolute inset-0 w-full h-full object-cover transform scale-105 transition-opacity duration-1000 ease-in-out ${
                idx === heroIndex ? "opacity-45" : "opacity-0"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-[#4A0C16]/95 via-black/40 to-black/70" />
        </div>

        <div className="relative z-10 w-full h-full max-w-5xl mx-auto px-6 md:px-12 flex flex-col justify-end pt-20 pb-8 md:pb-12">
          <div className="flex flex-col items-center text-center">
            <p className="text-base md:text-xl text-white/90 mb-8 max-w-3xl mx-auto font-light tracking-wide leading-relaxed drop-shadow-md">
              Explore, discover, and safeguard the rich historical archives, artifacts, and living traditions of the Meranaw people managed by Mindanao State University.
            </p>
            
            <button
              onClick={() => changePage("overview")}
              className="group relative inline-flex items-center justify-center gap-3 bg-[#4A0C16] hover:bg-[#31080E] text-white font-sans text-base font-bold tracking-wider uppercase px-12 py-4 rounded-xl border-2 border-[#E09F26] transition-all duration-300 shadow-[0_0_25px_rgba(74,12,22,0.6)] hover:shadow-[0_0_35px_rgba(224,159,38,0.5)] hover:-translate-y-1"
            >
              Explore Archive
              <ArrowRight size={20} className="text-[#E09F26] transform group-hover:translate-x-1.5 transition-transform duration-200" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. Mission Statement */}
      <section className="py-20 px-8 bg-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-serif text-[#4A0C16] mb-4 font-bold">
              Our Mission
            </h3>
            <div className="w-24 h-1 bg-[#E09F26] mx-auto rounded-full"></div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-10 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-[#E09F26]/30 group">
              <Shield className="w-14 h-14 text-[#E09F26] mb-6 group-hover:scale-110 transition-transform duration-300" />
              <h4 className="text-2xl font-serif text-[#4A0C16] mb-4 font-bold">Preserve</h4>
              <p className="text-gray-700 leading-relaxed">
                Safeguard invaluable cultural artifacts and knowledge for future generations
                through centralized digital archiving.
              </p>
            </div>
            
            <div className="bg-white p-10 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-[#E09F26]/30 group">
              <Search className="w-14 h-14 text-[#E09F26] mb-6 group-hover:scale-110 transition-transform duration-300" />
              <h4 className="text-2xl font-serif text-[#4A0C16] mb-4 font-bold">Access</h4>
              <p className="text-gray-700 leading-relaxed">
                Provide enhanced accessibility to cultural collections for researchers, students,
                and the global community.
              </p>
            </div>
            
            <div className="bg-white p-10 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-[#E09F26]/30 group">
              <History className="w-14 h-14 text-[#E09F26] mb-6 group-hover:scale-110 transition-transform duration-300" />
              <h4 className="text-2xl font-serif text-[#4A0C16] mb-4 font-bold">Validate</h4>
              <p className="text-gray-700 leading-relaxed">
                Ensure authenticity and accuracy through a comprehensive validation workflow
                and monitoring system.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CORE REPOSITORIES */}
      <section className="py-20 px-8 bg-transparent border-y border-[#E09F26]/20">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-4xl font-serif text-[#4A0C16] text-center mb-12 font-bold">
            Core Repositories
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Artifacts", desc: "Explore physical legacies, master brassworks, and traditional weaves.", icon: <Shield className="w-8 h-8 text-[#E09F26]" /> },
              { title: "Publications", desc: "Access literary archives, academic research, and history journals.", icon: <BookOpen className="w-8 h-8 text-[#E09F26]" /> },
              { title: "Historical Records", desc: "Browse validated official university histories, registries, and timelines.", icon: <History className="w-8 h-8 text-[#E09F26]" /> },
            ].map((collection, index) => {
              
              const featuredForCategory = featuredItems.find(
                (item) => item.category?.toLowerCase() === collection.title.toLowerCase()
              );

              return (
                <div
                  key={index}
                  onClick={() => changePage("overview")}
                  className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-[#E09F26]/30 group flex flex-col justify-between h-full"
                >
                  <div>
                    <div className="h-40 rounded-xl mb-6 overflow-hidden relative bg-gradient-to-br from-[#4A0C16] to-[#E09F26] flex items-center justify-center shadow-inner">
                      {featuredForCategory?.imageUrl ? (
                        <>
                          <img 
                            src={featuredForCategory.imageUrl} 
                            alt={featuredForCategory.title} 
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
                        </>
                      ) : (
                        <div className="p-4 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 group-hover:scale-110 transition-transform duration-300">
                          {collection.icon}
                        </div>
                      )}
                    </div>
                    
                    <h4 className="text-2xl font-serif text-[#4A0C16] mb-2 font-bold">{collection.title}</h4>
                    <p className="text-sm text-gray-600 mb-4">{collection.desc}</p>
                  </div>

                  <p className="text-xs text-[#E09F26] font-semibold tracking-wider uppercase inline-flex items-center gap-1 group-hover:text-[#4A0C16] transition-colors mt-4">
                    Explore Collection <ArrowRight size={14} />
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. About Section */}
      <section className="py-24 px-8 bg-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-4xl font-serif text-[#4A0C16] mb-8 font-bold">About the Archive</h3>
          <p className="text-xl text-gray-700 leading-relaxed mb-6 font-medium">
            The Digital Heritage Archive System addresses critical challenges in preserving
            Meranaw cultural heritage: lack of centralized archiving, limited accessibility,
            absence of validation workflows, risk of data loss, and inadequate monitoring tools.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed">
            Our comprehensive platform provides a secure, accessible, and professionally managed
            solution for safeguarding and sharing cultural treasures with the world.
          </p>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="bg-[#4A0C16] text-white py-10 px-8 mt-auto">
        <div className="max-w-7xl mx-auto text-center flex flex-col items-center justify-center">
          <BookOpen className="w-8 h-8 text-[#E09F26] mb-4 opacity-80" />
          <p className="text-sm text-gray-300">
            © 2026 MSU Meranaw Cultural Heritage Center. All rights reserved.
          </p>
          <p className="text-sm mt-2 text-[#E09F26] font-semibold tracking-wider uppercase">
            Digital Heritage Archive System
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;