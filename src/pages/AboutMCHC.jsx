import React from "react";
import Navbar from "../components/Navbar"; // Make sure this path is correct based on your folder structure
import { Landmark, Users, ScrollText, Image as ImageIcon } from "lucide-react";
import okirPattern from "../assets/okir-pattern.png";
import mchcBuilding from "../assets/mchc-building.jpg";
import mchcHead from "../assets/mchc-head.jpg";

const AboutMCHC = ({ changePage }) => {
  return (
    <div className="min-h-screen bg-[#FFFDF7] font-sans flex flex-col">
      {/* 1. Standard Navbar */}
      <Navbar changePage={changePage} />

      {/* 2. Hero Section with Okir Pattern */}
      <div className="relative w-full bg-[#4A0C16] text-white py-10 px-6 md:px-12 flex flex-col items-center justify-center border-b-[6px] border-[#E09F26] overflow-hidden">
  
  <div 
    className="absolute inset-0 opacity-10 z-0" 
    style={{ 
      /* We use the variable 'okirPattern' here instead of a string */
      backgroundImage: `url(${okirPattern})`,
      backgroundRepeat: "repeat",
      backgroundSize: "100px", /* Change this to "80px" for a very small pattern */
      backgroundPosition: "center"
    }}
  ></div>
  
  <div className="relative z-10 text-center max-w-3xl">
    <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-wide mb-4 text-[#E09F26]">
      About MSU-MCHC
    </h1>
  </div>
</div>

      {/* 3. Main Content Container */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-6 md:px-12 py-12 md:py-16 space-y-16">
        
        {/* History & Mission Section */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Landmark className="w-8 h-8 text-[#E09F26]" />
              <h2 className="text-3xl font-serif font-bold text-[#4A0C16]">Our History & Mission</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-6 text-justify">
              The Mindanao State University Meranaw Cultural Heritage Center (MSU-MCHC) was established to serve as the premier academic repository for Meranaw artifacts, literature, and historical documents. Our mission is to bridge the gap between ancestral wisdom and modern academic research.
            </p>
            <p className="text-gray-700 leading-relaxed text-justify">
              By digitizing these vital cultural assets, we ensure that researchers, students, and future generations have uninterrupted, validated access to the authentic history of the Meranaw people, safeguarding it against the passage of time.
            </p>
          </div>
          {/* Center Building Image */}
<div className="bg-[#E09F26]/20 p-2 rounded-2xl shadow-lg">
  <img 
    src={mchcBuilding} 
    alt="MSU-MCHC Building" 
    className="w-full h-72 object-cover rounded-xl border border-[#4A0C16]/10"
  />
</div>
        </section>

        <hr className="border-[#E09F26]/30" />

        {/* Leadership Section */}
        <section>
          {/* 1. Change justify-center to justify-start here: */}
          <div className="flex items-center gap-3 mb-8 justify-start">
            <Users className="w-8 h-8 text-[#E09F26]" />
            {/* 2. Change text-center to text-left here: */}
            <h2 className="text-3xl font-serif font-bold text-[#4A0C16] text-left">Center Leadership</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Director Card */}
            <div className="col-span-1 md:col-span-1 bg-white rounded-2xl p-6 shadow-md border-t-4 border-[#4A0C16] flex flex-col items-center text-center">
  {/* Circular Photo Container */}
  <div className="w-32 h-32 bg-gray-100 rounded-full mb-4 border-4 border-[#E09F26] overflow-hidden flex items-center justify-center shadow-inner">
    <img 
      src={mchcHead} 
      alt="Ms. Ayesha Merdeka M. Alonto" 
      className="w-full h-full object-cover" 
    />
  </div>
  
  <h3 className="text-xl font-bold text-[#4A0C16]">Ms. Ayesha Merdeka M. Alonto</h3>
  <p className="text-[#E09F26] font-semibold text-sm uppercase tracking-wider mb-4">MSU-MCHC Head</p>
  <p className="text-gray-600 text-sm leading-relaxed">
    Guiding the academic and curatorial vision of the repository, ensuring all archived items meet the highest standards of historical validation.
  </p>
</div>

            {/* Curatorial Team Info */}
            <div className="col-span-1 md:col-span-2 bg-[#4A0C16] text-white rounded-2xl p-8 shadow-md relative overflow-hidden flex flex-col justify-center">
              <div className="absolute -right-10 -bottom-10 opacity-10">
                <ScrollText className="w-64 h-64" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-[#E09F26] mb-4 relative z-10">The Curatorial Process</h3>
              <p className="text-gray-200 leading-relaxed mb-4 relative z-10 text-justify">
                Every artifact, proverb, and historical record within the Digital Archive undergoes a rigorous validation process. Our team of dedicated researchers, local historians, and academic moderators work collaboratively to verify the authenticity, translation, and historical context of each submission.
              </p>
              <p className="text-gray-200 leading-relaxed relative z-10 text-justify">
                This process guarantees that the MSU-MCHC remains a trusted, peer-reviewed source of cultural data for academics worldwide.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action for Guests */}
        <section className="text-center pb-8 mt-12">
          <button 
            onClick={() => changePage("landing")}
            className="px-8 py-3 bg-[#E09F26] text-[#4A0C16] font-bold rounded-lg hover:bg-[#C88A21] hover:shadow-lg transition-all active:scale-95 uppercase tracking-wide"
          >
            Return to Archive
          </button>
        </section>

      </div>
    </div>
  );
};

export default AboutMCHC;