import React from "react";
import { auth } from "../firebase/firebase";
import { BookOpen } from "lucide-react"; 

const Navbar = ({ changePage }) => {
  // Check if a user is currently logged in
  const currentUser = auth.currentUser;

  return (
    <nav className="w-full bg-[#4A0C16] h-20 shadow-2xl relative flex items-center justify-between px-6 md:px-12 border-b border-[#E09F26]/30 select-none overflow-hidden sticky top-0 z-50">
      
      {/* LEFT SIDE: Institutional Branding */}
      <div 
        className="flex items-center gap-3 z-10 bg-transparent px-4 py-2 rounded-xl cursor-pointer"
        onClick={() => changePage("landing")}
      >
        <BookOpen className="w-8 h-8 text-[#E09F26]" />
        <div className="flex flex-col justify-center">
          <span className="font-serif text-white text-lg md:text-xl font-bold tracking-wider leading-tight">
            MSU MERANAW
          </span>
          <span className="font-sans text-[#E09F26] text-xs md:text-sm font-semibold tracking-widest uppercase">
            Cultural Heritage Center
          </span>
        </div>
      </div>

      {/* RIGHT SIDE: Navigation & Action Buttons */}
      <div className="flex items-center gap-4 z-10 bg-transparent px-5 py-2.5 rounded-xl h-auto">
        
        {/* If user is logged in, show Dashboard button. Otherwise, show Login/Register */}
        {currentUser ? (
          <button
            onClick={() => changePage("dashboard")}
            className="px-6 py-2 bg-[#E09F26] text-white font-bold rounded-lg hover:bg-[#C88A21] hover:shadow-md transition-all active:scale-95 text-sm uppercase tracking-wide"
          >
            Go to Dashboard
          </button>
        ) : (
          <>
            <button
              onClick={() => changePage("login")}
              className="px-6 py-2 bg-white text-[#4A0C16] font-bold rounded-lg hover:bg-gray-100 hover:shadow-md transition-all active:scale-95 text-sm uppercase tracking-wide"
            >
              Login
            </button>
            <button
              onClick={() => changePage("register")}
              className="px-6 py-2 bg-[#E09F26] text-white font-bold rounded-lg hover:bg-[#C88A21] hover:shadow-md transition-all active:scale-95 text-sm uppercase tracking-wide"
            >
              Register
            </button>
          </>
        )}

      </div>
    </nav>
  );
};

export default Navbar;