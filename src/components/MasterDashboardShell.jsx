import React, { useState, useEffect } from "react";
import LanguageSwitcher from "./LanguageSwitcher"; 
import { 
  BookOpen, Menu, X, Bell, User, LogOut, 
  Settings, Moon, Sun, HelpCircle, Mail, ShieldCheck, Check, Save
} from "lucide-react";
import okirPattern from "../assets/okir-pattern.png"; 

// Firebase Auth imports
// Explicit .js extension prevents Vite from accidentally resolving firebase.json!
import { auth } from "../firebase/firebase.js";
import { sendPasswordResetEmail, onAuthStateChanged } from "firebase/auth";

const MasterDashboardShell = ({ 
  userRole,           
  userName,           
  userPhoto,
  userEmail, 
  activeTab,          
  setActiveTab,       
  sidebarLinks = [],  
  notificationCount = 0,
  onNotificationClick,
  onLogout,
  onUpdateUsername, 
  children            
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Feature States
  const [isDarkMode, setIsDarkMode] = useState(false); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  // Account Editing States
  const [displayName, setDisplayName] = useState(userName || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Email State & Observer
  const [detectedEmail, setDetectedEmail] = useState("");

  // Password Reset State
  const [resetStatus, setResetStatus] = useState("idle"); // idle | loading | sent

  const isStandardUser = userRole?.toLowerCase().trim() === "user";

  // Auto-detect user email as soon as Firebase Auth initializes
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser?.email) {
        setDetectedEmail(currentUser.email);
      }
    });
    return () => unsubscribe();
  }, []);

  // Email Priority Fallback: Passed Prop -> Observer State -> Direct Auth Instance
  const currentEmail = userEmail || detectedEmail || auth?.currentUser?.email || "";

  // Sync internal display name state if prop updates
  useEffect(() => {
    if (userName) setDisplayName(userName);
  }, [userName]);

  // Handle Display Name Save
  const handleSaveName = async () => {
    if (!displayName.trim() || displayName === userName) return;
    setIsSavingName(true);
    
    try {
      if (onUpdateUsername) {
        await onUpdateUsername(displayName.trim());
      }
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);
    } catch (err) {
      console.error("Failed to update username:", err);
    } finally {
      setIsSavingName(false);
    }
  };

  // Firebase Password Reset Handler
  const handlePasswordReset = async () => {
    if (!currentEmail) {
      alert("No registered email address found. Please make sure you are logged in.");
      return;
    }

    setResetStatus("loading");
    try {
      await sendPasswordResetEmail(auth, currentEmail);
      setResetStatus("sent");
    } catch (error) {
      console.error("Error sending password reset email:", error);
      alert(error.message || "Failed to send password reset link.");
      setResetStatus("idle");
    }
  };

  return (
    <div className={`min-h-screen font-sans antialiased flex flex-col lg:flex-row transition-colors duration-300 relative
      ${isDarkMode ? "bg-zinc-900 text-gray-200 selection:bg-amber-500/20" : "bg-[#FEF9C3] text-gray-800 selection:bg-[#4A0C16]/20"}
    `}>
      
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
        
        {/* Sidebar Header */}
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
              <h1 className="text-sm font-bold tracking-wide font-serif text-[#FDF5E6] capitalize leading-tight">{userRole} Dashboard</h1>
              <p className="text-[9px] tracking-widest text-[#E09F26] uppercase font-bold leading-none mt-0.5">Digital Archive</p>
            </div>
          </div>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <p className="text-[10px] text-[#E09F26] uppercase tracking-widest font-extrabold px-3 mb-3">Collection Filters</p>
          
          {sidebarLinks.map((link) => {
            const isActive = activeTab === link.value;
            const isNotificationTab = link.value === "notifications" || link.label?.toLowerCase().includes("notif");
            const showRedPingOnSidebar = isNotificationTab && notificationCount > 0;

            return (
              <button 
                key={link.value}
                onClick={() => { setActiveTab(link.value); setIsMobileMenuOpen(false); }} 
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 relative group
                  ${isActive ? "bg-white/10 text-[#E09F26] shadow-inner font-black" : "text-white/70 hover:text-white hover:bg-white/5"}`}
              >
                {isActive && <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#E09F26] rounded-r-md" />}
                <div className="flex items-center gap-3 w-full justify-between">
                  <div className="flex items-center gap-3">
                    {React.cloneElement(link.icon, { className: isActive ? "text-[#E09F26]" : "text-white/50 group-hover:text-white" })}
                    <span>{link.label}</span>
                  </div>

                  {showRedPingOnSidebar && (
                    <div className="flex items-center gap-1.5">
                      <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none shadow-xs">
                        {notificationCount > 99 ? "99+" : notificationCount}
                      </span>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Profile Footer */}
        <div className="p-4 border-t border-[#E09F26]/10 bg-[#3A0911]/60 backdrop-blur-sm shrink-0 relative">
          
          {/* Profile Popover Menu */}
          {isProfileOpen && (
            <div className={`absolute bottom-[84px] left-4 right-4 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-fadeIn w-[calc(100%-2rem)]
              ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-gray-200' : 'bg-white border-gray-100 text-gray-800'}
            `}>
              
              {/* Header Info */}
              <div className={`p-4 border-b flex items-center gap-3 ${isDarkMode ? 'bg-zinc-800/80 border-zinc-700' : 'bg-gray-50/80 border-gray-100'}`}>
                {userPhoto ? (
                  <img src={userPhoto} alt={displayName} className="w-11 h-11 rounded-full border-2 border-amber-500/30 shadow-sm object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#4A0C16] text-[#FEF9C3] flex items-center justify-center font-bold text-lg shadow-sm font-serif">
                    {displayName ? displayName.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <div className="flex flex-col overflow-hidden">
                  <span className="font-bold text-sm truncate font-serif capitalize">{displayName || "Archive User"}</span>
                  <span className={`text-[11px] truncate ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>{currentEmail || "No email provided"}</span>
                </div>
              </div>

              {/* Toggles and Links */}
              <div className={`p-1.5 space-y-0.5 ${isDarkMode ? 'bg-zinc-800' : 'bg-white'}`}>
                <button 
                  onClick={() => { setIsSettingsOpen(true); setIsProfileOpen(false); }} 
                  className={`w-full flex items-center gap-2.5 p-2 text-xs font-bold rounded-xl transition-all text-left ${isDarkMode ? 'hover:bg-zinc-700' : 'hover:bg-gray-50'}`}
                >
                  <Settings size={15} className="text-gray-400" /> Account Settings
                </button>
                
                <button 
                  onClick={() => { setIsHelpOpen(true); setIsProfileOpen(false); }} 
                  className={`w-full flex items-center gap-2.5 p-2 text-xs font-bold rounded-xl transition-all text-left ${isDarkMode ? 'hover:bg-zinc-700' : 'hover:bg-gray-50'}`}
                >
                  <HelpCircle size={15} className="text-gray-400" /> Help & Guide
                </button>
                
                {/* 🌙 Dark Mode Toggle */}
                <div className={`w-full flex items-center justify-between p-2 rounded-xl ${isDarkMode ? 'bg-zinc-900/50' : 'bg-gray-50/50'}`}>
                  <span className="flex items-center gap-2.5 text-xs font-bold text-gray-500 dark:text-zinc-400">
                    {isDarkMode ? <Moon size={15} className="text-indigo-400" /> : <Sun size={15} className="text-amber-500" />} Dark Mode
                  </span>
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${isDarkMode ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-4.5' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {/* Sign Out */}
              <div className={`p-1.5 border-t ${isDarkMode ? 'bg-zinc-900/50 border-zinc-700' : 'bg-gray-50/50 border-gray-100'}`}>
                <button onClick={onLogout} className="w-full text-left px-3 py-2 text-xs text-red-500 font-bold rounded-xl hover:bg-red-500/10 flex items-center gap-2 transition-all cursor-pointer">
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Bottom Bar Clickable Area */}
          <div 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5 cursor-pointer hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-3 truncate">
              {userPhoto ? (
                <img src={userPhoto} alt={displayName} className="w-9 h-9 rounded-full object-cover shadow-md shrink-0 bg-white/10" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#E09F26] flex items-center justify-center text-[#4A0C16] font-bold shadow-md shrink-0 font-serif">
                  {displayName ? displayName.charAt(0).toUpperCase() : <User size={16} />}
                </div>
              )}
              <div className="truncate">
                <p className="text-xs font-bold text-[#FDF5E6] truncate capitalize font-serif">{displayName || "User"}</p>
                <p className="text-[10px] text-white/50 truncate capitalize">{userRole} Account</p>
              </div>
            </div>
            <div className={`p-1.5 rounded-lg transition-all ${isProfileOpen ? "text-[#E09F26] bg-white/10" : "text-white/60 hover:text-[#E09F26]"}`}>
              <User size={16} />
            </div>
          </div>
        </div>
      </aside>

      {/* PRIMARY CONTENT CANVAS */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-[#E09F26] h-[73px] px-6 lg:px-10 flex items-center justify-between border-b border-[#4A0C16]/20 sticky top-0 z-40 shadow-md shrink-0">
          <div>
            <p className="text-[10px] font-extrabold text-[#4A0C16]/60 uppercase tracking-widest leading-none">Current Section</p>
            <h2 className="text-sm font-black font-serif text-[#4A0C16] capitalize tracking-wide mt-0.5 leading-tight">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-3">
            {isStandardUser && <LanguageSwitcher />}
            {!isStandardUser && (
              <button 
                onClick={onNotificationClick} 
                className="relative bg-[#4A0C16] text-[#FDF5E6] px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-md text-xs transition-all hover:bg-[#32080F]"
              >
                <div className="relative">
                  <Bell size={14} className="text-[#E09F26]" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline">Notifications</span>
                {notificationCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none shadow-xs">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>

        <main className="px-4 md:px-6 lg:px-10 pt-4 md:pt-6 pb-8 max-w-7xl w-full mx-auto flex-1 flex flex-col">
          {children}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* ⚙️ MODAL: ACCOUNT SETTINGS                                                */}
      {/* ========================================================================= */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 animate-fadeIn">
          <div className={`w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-gray-200' : 'bg-white border-gray-100 text-gray-800'}`}>
            
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#4A0C16]/10 text-[#4A0C16] rounded-xl"><Settings size={20} /></div>
                <div>
                  <h3 className="text-base font-bold font-serif text-[#4A0C16]">Account Settings</h3>
                  <p className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Manage your profile display and security options</p>
                </div>
              </div>
              <button onClick={() => { setIsSettingsOpen(false); setResetStatus("idle"); }} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl transition cursor-pointer"><X size={18} /></button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-sm">
              
              {/* Editable Display Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Display Name</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className={`flex-1 p-3 rounded-xl border font-medium text-sm outline-none transition ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-amber-500' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-[#4A0C16]'}`} 
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={isSavingName || displayName === userName || !displayName.trim()}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
                      nameSaved 
                        ? "bg-emerald-600 text-white" 
                        : displayName !== userName && displayName.trim() 
                          ? "bg-[#4A0C16] text-white hover:bg-[#32080F] cursor-pointer" 
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {nameSaved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}
                  </button>
                </div>
              </div>

              {/* Registered Email (Auto-detected) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Email Address</label>
                <input 
                  type="email" 
                  disabled 
                  value={currentEmail || "No email provided"} 
                  className={`w-full p-3 rounded-xl border font-medium text-sm cursor-not-allowed ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700 text-zinc-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`} 
                />
              </div>

              {/* Role Badge */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${isDarkMode ? 'bg-zinc-800/40 border-zinc-700' : 'bg-amber-50/60 border-amber-200/60'}`}>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={18} className="text-[#E09F26]" />
                  <div>
                    <p className="text-xs font-bold uppercase text-gray-500">Account Privilege</p>
                    <p className="text-sm font-bold capitalize text-[#4A0C16]">{userRole || "User"} Role</p>
                  </div>
                </div>
              </div>

              {/* Password Reset Section */}
              <div className="pt-4 border-t border-gray-200 dark:border-zinc-700">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Password & Security</h4>
                    <p className="text-xs text-gray-400 mt-0.5">Need to change your password?</p>
                  </div>
                  <button 
                    onClick={handlePasswordReset}
                    disabled={resetStatus !== "idle" || !currentEmail}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2
                      ${resetStatus === "idle" && currentEmail ? "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 cursor-pointer" : ""}
                      ${!currentEmail ? "bg-gray-200 text-gray-400 cursor-not-allowed" : ""}
                      ${resetStatus === "loading" ? "bg-gray-100 text-gray-400 cursor-wait" : ""}
                      ${resetStatus === "sent" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : ""}
                    `}
                  >
                    {resetStatus === "idle" && <><Mail size={14}/> Send Reset Email</>}
                    {resetStatus === "loading" && "Sending..."}
                    {resetStatus === "sent" && <><Check size={14}/> Link Sent!</>}
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex justify-end ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-gray-50 border-gray-100'}`}>
              <button onClick={() => { setIsSettingsOpen(false); setResetStatus("idle"); }} className="px-5 py-2 bg-[#4A0C16] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#32080F] transition cursor-pointer">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

{isHelpOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 animate-fadeIn">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-gray-200' : 'bg-white border-gray-100 text-gray-800'}`}>
            
            {/* Header */}
            <div className={`p-5 border-b flex items-center justify-between ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#E09F26]/10 text-[#E09F26] rounded-xl"><HelpCircle size={20} /></div>
                <div>
                  <h3 className="text-base font-bold font-serif text-[#4A0C16] capitalize">{userRole || "User"} Quick Guide</h3>
                  <p className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>System instructions tailored for your role</p>
                </div>
              </div>
              <button onClick={() => setIsHelpOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl transition cursor-pointer"><X size={18} /></button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              
              {/* 👑 ADMIN GUIDE */}
              {userRole?.toLowerCase().trim() === "admin" && (
                <>
                  <div>
                    <h4 className="font-bold text-sm text-[#E09F26] mb-1">👥 User & Role Management</h4>
                    <p className={isDarkMode ? 'text-zinc-300' : 'text-gray-600'}>
                      Grant or revoke user roles (Encoder, Moderator, Admin). Manage system privileges and safeguard platform access.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#E09F26] mb-1">🛡️ System Administration & Recycle Bin</h4>
                    <p className={isDarkMode ? 'text-zinc-300' : 'text-gray-600'}>
                      Oversee archive health, restore deleted items from the Recycle Bin, and monitor overall content activity.
                    </p>
                  </div>
                </>
              )}

              {/* 🛡️ MODERATOR GUIDE */}
              {userRole?.toLowerCase().trim() === "moderator" && (
                <>
                  <div>
                    <h4 className="font-bold text-sm text-[#E09F26] mb-1">📋 Moderation Queue</h4>
                    <p className={isDarkMode ? 'text-zinc-300' : 'text-gray-600'}>
                      Review incoming submissions from Encoders. Check titles, descriptions, and uploaded media for cultural and historical accuracy.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#E09F26] mb-1">✅ Approvals & Rejections</h4>
                    <p className={isDarkMode ? 'text-zinc-300' : 'text-gray-600'}>
                      Approve items to publish them to the main archive, or reject them with constructive notes so Encoders know what to revise.
                    </p>
                  </div>
                </>
              )}

              {/* 📝 ENCODER GUIDE */}
              {userRole?.toLowerCase().trim() === "encoder" && (
                <>
                  <div>
                    <h4 className="font-bold text-sm text-[#E09F26] mb-1">📤 Submitting Heritage Items</h4>
                    <p className={isDarkMode ? 'text-zinc-300' : 'text-gray-600'}>
                      Add new entries, proverbs, and cultural artifacts. Fill out all required media fields accurately before sending for moderation.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#E09F26] mb-1">📊 Tracking & Revising Submissions</h4>
                    <p className={isDarkMode ? 'text-zinc-300' : 'text-gray-600'}>
                      Monitor your submission statuses (Pending, Approved, Rejected). If a submission is rejected, view the moderator's notes and resubmit your changes.
                    </p>
                  </div>
                </>
              )}

              {/* 👤 STANDARD USER GUIDE */}
              {(userRole?.toLowerCase().trim() === "user" || !["admin", "moderator", "encoder"].includes(userRole?.toLowerCase().trim())) && (
                <>
                  <div>
                    <h4 className="font-bold text-sm text-[#E09F26] mb-1">🔍 Browsing & Searching</h4>
                    <p className={isDarkMode ? 'text-zinc-300' : 'text-gray-600'}>
                      Explore cultural heritage collections using sidebar filters or search directly using key terms and titles.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#E09F26] mb-1">🌐 Language Preferences</h4>
                    <p className={isDarkMode ? 'text-zinc-300' : 'text-gray-600'}>
                      Use the header language switcher to translate content into your preferred dialect or language.
                    </p>
                  </div>
                </>
              )}

              {/* ⚙️ COMMON TO ALL ROLES */}
              <div>
                <h4 className="font-bold text-sm text-[#E09F26] mb-1">⚙️ Account & Dark Mode</h4>
                <p className={isDarkMode ? 'text-zinc-300' : 'text-gray-600'}>
                  Click your profile card at the bottom of the sidebar to edit display settings, send a password reset link, or switch Dark Mode on/off.
                </p>
              </div>

            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex justify-end ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-gray-50 border-gray-100'}`}>
              <button 
                onClick={() => setIsHelpOpen(false)} 
                className="px-5 py-2 bg-[#4A0C16] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#32080F] transition cursor-pointer"
              >
                Got It
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default MasterDashboardShell;