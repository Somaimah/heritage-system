// MasterDashboardShell.jsx
import React, { useState } from "react";
import LanguageSwitcher from "./LanguageSwitcher"; 
import { BookOpen, Menu, X, Bell, User, LogOut } from "lucide-react";
import okirPattern from "../assets/okir-pattern.png"; 

const MasterDashboardShell = ({ 
  userRole,           
  userName,           
  userPhoto,          
  activeTab,          
  setActiveTab,       
  sidebarLinks = [],  
  notificationCount = 0,
  onNotificationClick,
  onLogout,
  children            
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if the current user is a standard "user"
  const isStandardUser = userRole?.toLowerCase().trim() === "user";

  return (
    <div className="min-h-screen bg-[#FEF9C3] text-gray-800 font-sans antialiased flex flex-col lg:flex-row selection:bg-[#4A0C16]/20 selection:text-[#4A0C16]">
      
      {/* 📱 MOBILE HEADER */}
      <div className="lg:hidden w-full bg-[#4A0C16] text-white p-4 flex items-center justify-between shadow-md sticky top-0 z-50 border-b border-[#E09F26]/40">
        <div className="flex items-center gap-2">
          <BookOpen size={24} className="text-[#E09F26]" />
          <h1 className="text-lg font-bold font-serif text-[#FDF5E6] capitalize">{userRole} Panel</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* 👑 SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#4A0C16] text-white flex flex-col border-r border-[#E09F26]/30 shadow-2xl transition-transform duration-300 transform 
        lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:shrink-0
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        
        {/* Sidebar Header with Okir Pattern */}
        <div 
          className="w-full h-[73px] flex items-center gap-3 px-6 border-b border-[#E09F26]/30 bg-[#4A0C16] shrink-0 relative overflow-hidden"
          style={{ backgroundImage: `url(${okirPattern})`, backgroundSize: 'contain', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-[#4A0C16]/80 backdrop-blur-xs z-0" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="bg-[#E09F26]/10 p-1.5 rounded-lg border border-[#E09F26]/20">
              <BookOpen size={20} className="text-[#E09F26]" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide font-serif text-[#FDF5E6] capitalize leading-tight">{userRole} Workspace</h1>
              <p className="text-[9px] tracking-widest text-[#E09F26] uppercase font-bold leading-none mt-0.5">System Repository</p>
            </div>
          </div>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <p className="text-[10px] text-[#E09F26] uppercase tracking-widest font-extrabold px-3 mb-3">Repository Filters</p>
          
          {sidebarLinks.map((link) => {
            const isActive = activeTab === link.value;
            
            // --- STEP 5: Check if this is the user's notification sidebar option ---
            const isNotificationTab = link.value === "notifications" || link.label?.toLowerCase().includes("notif");
            const showRedPingOnSidebar = isStandardUser && isNotificationTab && notificationCount > 0;

            return (
              <button 
                key={link.value}
                onClick={() => { setActiveTab(link.value); setIsMobileMenuOpen(false); }} 
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 relative group
                  ${isActive ? "bg-white/10 text-[#E09F26] shadow-inner font-black" : "text-white/70 hover:text-white hover:bg-white/5"}`}
              >
                {isActive && <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#E09F26] rounded-r-md" />}
                <div className="flex items-center gap-3">
                  {React.cloneElement(link.icon, { 
                    className: isActive ? "text-[#E09F26]" : "text-white/50 group-hover:text-white" 
                  })}
                  
                  <span className="flex items-center gap-1.5">
                    {link.label}
                    {/* STEP 5: Animated red ping sign right on the notification text name */}
                    {showRedPingOnSidebar && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}
                  </span>
                </div>

                {/* Show standard badge if specified, otherwise append notification counter for user role */}
                {link.badge !== undefined ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${isActive ? "bg-[#E09F26] text-[#4A0C16]" : "bg-white/10 text-white/60"}`}>
                    {link.badge}
                  </span>
                ) : (
                  showRedPingOnSidebar && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-red-500 text-white shadow-sm animate-pulse">
                      {notificationCount}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </nav>

        {/* Profile Footer */}
        <div className="p-4 border-t border-[#E09F26]/10 bg-[#3A0911]/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-3 truncate">
              
              {/* ✅ UPDATED AVATAR SECTION */}
              {userPhoto ? (
                <img 
                  src={userPhoto} 
                  alt={userName} 
                  className="w-9 h-9 rounded-full border border-[#E09F26]/40 shadow-md shrink-0 object-cover bg-white/10"
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#E09F26] flex items-center justify-center text-[#4A0C16] font-bold shadow-md shrink-0 font-serif">
                  {userName ? userName.charAt(0).toUpperCase() : <User size={16} strokeWidth={2.5} />}
                </div>
              )}
              {/* ✅ END OF AVATAR SECTION */}

              <div className="truncate">
                <p className="text-xs font-bold text-[#FDF5E6] truncate capitalize font-serif">{userName}</p>
                <p className="text-[10px] text-white/50 truncate capitalize">{userRole} Account</p>
              </div>
            </div>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)} 
              className="p-1.5 rounded-lg text-white/60 hover:text-[#E09F26] hover:bg-white/5 transition-all"
            >
              <User size={16} />
            </button>
          </div>

          {isProfileOpen && (
            <div className="mt-2 bg-white rounded-xl shadow-xl border border-[#E09F26]/20 p-2 text-gray-800">
              <button 
                onClick={onLogout} 
                className="w-full flex items-center gap-2.5 px-2 py-2 text-xs text-red-600 hover:bg-red-50 font-bold rounded-lg transition"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* PRIMARY CONTENT CANVAS */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER */}
        <header className="bg-[#E09F26] h-[73px] px-6 lg:px-10 flex items-center justify-between border-b border-[#4A0C16]/20 sticky top-0 z-40 shadow-md shrink-0">
          <div>
            <p className="text-[10px] font-extrabold text-[#4A0C16]/60 uppercase tracking-widest leading-none">Active Workspace</p>
            <h2 className="text-sm font-black font-serif text-[#4A0C16] capitalize tracking-wide mt-0.5 leading-tight">{activeTab} View Console</h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center h-10 gap-3">
              
              {/* Only show Language Switcher if role IS "user" */}
              {isStandardUser && (
                <div className="flex items-center h-full">
                  <LanguageSwitcher />
                </div>
              )}

              {/* Only show Notifications if role is NOT "user" */}
              {!isStandardUser && (
                <button 
                  onClick={onNotificationClick} 
                  className="relative h-full bg-[#4A0C16] hover:bg-[#31080E] text-[#FDF5E6] px-4 rounded-xl flex items-center gap-2 font-bold transition duration-300 shadow-md text-xs border border-transparent active:scale-95"
                >
                  <Bell size={14} className="text-[#E09F26]" /> 
                  <span className="hidden sm:inline">Notifications</span>
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 border-[#E09F26] animate-pulse">
                      {notificationCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-10 max-w-7xl w-full mx-auto flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MasterDashboardShell;