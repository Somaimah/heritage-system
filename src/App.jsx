import { useTranslation } from 'react-i18next';
import React, { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import Loader from "./components/Loader";

// 🔔 Notification System Context Integration
import { ToastProvider } from "./components/ToastContext";

// Auth
import Login from "./auth/Login";
import Register from "./auth/Register";

// Dashboards
import UserDashboard from "./pages/dashboard/UserDashboard";
import EncoderDashboard from "./pages/dashboard/EncoderDashboard";
import ModeratorDashboard from "./pages/dashboard/ModeratorDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";

// Pages
import LandingPage from "./pages/shared/LandingPage";
import Overview from "./overview/Overview";
import UploadPage from "./pages/shared/UploadPage";
import ProverbUploadPage from "./pages/shared/ProverbUploadPage"; 
import ItemDetailPage from "./pages/shared/ItemDetailPage";
import NotificationsPage from "./pages/shared/NotificationsPage";
import BookmarkPage from "./pages/shared/BookmarkPage";
// 🟢 FIXED IMPORT PATH AND NAME MATCH
import SharedPublishedProverbs from "./pages/shared/SharedPublishedProverbs";
import ProverbDetailPage from "./pages/shared/ProverbDetailPage";

// Lucide icon for the unified confirmation modal
import { LogOut } from "lucide-react";
import okirPattern from "./assets/okir-pattern.png"; 

const App = () => {
  const { t, i18n } = useTranslation();

  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem("saved_page");
    return saved || "landing";
  });
  
  const [pageData, setPageData] = useState(() => {
    try {
      const savedData = localStorage.getItem("saved_page_data");
      return savedData ? JSON.parse(savedData) : {};
    } catch (e) {
      console.error("Failed to parse page data:", e);
      return {};
    }
  });

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const pageRef = useRef(page);

  const changePage = (newPage, data = {}) => {
    if ((newPage === "itemdetail" || newPage === "proverbdetail" || newPage === "upload") && !data.fromPage) {
      data.fromPage = pageRef.current; 
    }

    setPage(newPage);
    pageRef.current = newPage;
    setPageData(data);
    localStorage.setItem("saved_page", newPage);
    localStorage.setItem("saved_page_data", JSON.stringify(data));
  };

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // ================= UNIFIED GLOBAL LOGOUT ACTIONS =================
  const handleGlobalLogout = async () => {
    try {
      await i18n.changeLanguage('en');
      localStorage.removeItem('i18nextLng');
      
      localStorage.removeItem("saved_page");
      localStorage.removeItem("saved_page_data");
      
      setIsLogoutModalOpen(false);
      await signOut(auth);
      
      changePage("landing");
      window.location.reload();
    } catch (err) {
      console.error("Global Logout error:", err);
    }
  };

  const triggerLogoutModal = () => {
    setIsLogoutModalOpen(true);
  };

  // ================= SECURE ROUTE & SESSION KEEP ALIVE =================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          const isRegistering = localStorage.getItem("isRegistering");
          if (pageRef.current === "register" || isRegistering === "true") {
            setLoading(false);
            return; 
          }

          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          setUser(currentUser);
          const userRole = userDoc.exists() ? userDoc.data().role : "user";
          
          console.log("DEBUG: Current User Email:", currentUser.email, "| Role from DB:", userRole);
          setRole(userRole);

          const savedPage = localStorage.getItem("saved_page");
          if (pageRef.current === "landing" || pageRef.current === "login") {
            i18n.changeLanguage('en');
            localStorage.removeItem('i18nextLng');
            
            if (savedPage && savedPage !== "landing" && savedPage !== "login") {
              const savedData = JSON.parse(localStorage.getItem("saved_page_data")) || {};
              changePage(savedPage, savedData);
            } else {
              changePage("dashboard");
            }
          }
        } else {
          setUser(null);
          setRole("guest");
          
          if (pageRef.current !== "register" && pageRef.current !== "login" && pageRef.current !== "overview" && pageRef.current !== "landing") {
            const savedPage = localStorage.getItem("saved_page");
            if (!savedPage || savedPage === "landing") {
              changePage("landing");
            }
          }
        }
      } catch (error) {
        console.error("Auth Listener Error:", error);
        setUser(null);
        setRole("guest");
        changePage("landing");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []); 

  if (loading) {
    return <Loader size="lg" />;
  }

  // ================= CENTRALIZED GLOBAL NAVIGATION RENDERING =================
  return (
    <ToastProvider>
      {page === "notifications" && <NotificationsPage changePage={changePage} />}
      {page === "bookmarks" && <BookmarkPage changePage={changePage} />}
      
      {page === "proverb" && (
        <SharedPublishedProverbs role={role} changePage={changePage} />
      )}
      
      {page === "landing" && <LandingPage changePage={changePage} />}
      {page === "login" && <Login goToRegister={() => changePage("register")} goBack={() => changePage("landing")} />}
      {page === "register" && <Register goBackToLogin={() => changePage("login")} />}
      {page === "overview" && <Overview changePage={changePage} />}
      
      {page === "upload" && (
        <UploadPage 
          changePage={changePage} 
          editItem={pageData?.editItem || JSON.parse(localStorage.getItem("saved_page_data"))?.editItem} 
        />
      )}

      {/* 🟢 UPDATED: Proverb Detail Route with LocalStorage Fallbacks */}
      {page === "proverbdetail" && (
        <ProverbDetailPage 
          changePage={changePage} 
          itemId={pageData?.itemId || JSON.parse(localStorage.getItem("saved_page_data"))?.itemId} 
          fromPage={pageData?.fromPage || JSON.parse(localStorage.getItem("saved_page_data"))?.fromPage || "dashboard"} 
          role={role} 
        />
      )}

      {page === "uploadProverb" && (
        <ProverbUploadPage 
          changePage={changePage} 
          user={user} 
          editItem={pageData?.editItem || JSON.parse(localStorage.getItem("saved_page_data"))?.editItem} 
        />
      )}
      
      {page === "itemdetail" && (
        <ItemDetailPage 
          changePage={changePage} 
          itemId={pageData?.itemId || JSON.parse(localStorage.getItem("saved_page_data"))?.itemId} 
          itemType={pageData?.itemType || JSON.parse(localStorage.getItem("saved_page_data"))?.itemType} 
          fromPage={pageData?.fromPage || JSON.parse(localStorage.getItem("saved_page_data"))?.fromPage || "dashboard"} 
          role={role} 
        />
      )}
      
      {page === "dashboard" && (
        <>
          {role === "encoder" && <EncoderDashboard user={user} changePage={changePage} triggerLogout={triggerLogoutModal} />}
          {role === "moderator" && <ModeratorDashboard user={user} changePage={changePage} triggerLogout={triggerLogoutModal} />}
          {role === "admin" && <AdminDashboard user={user} changePage={changePage} triggerLogout={triggerLogoutModal} />}
          {role === "user" && <UserDashboard user={user} changePage={changePage} triggerLogout={triggerLogoutModal} />}
        </>
      )}

      {/* 🟢 FIXED: Added "proverbdetail" to the Whitelist Array */}
      {!["notifications", "proverb", "proverbdetail", "bookmarks", "landing", "login", "register", "overview", "upload", "uploadProverb", "itemdetail", "dashboard"].includes(page) && (
        <div className="min-h-screen flex items-center justify-center text-red-600 font-bold text-xl">Page not found</div>
      )}

      {/* ================= UNIFIED SYSTEM LOGOUT OVERLAY MODAL ================= */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-[#4A0C16]/40 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-fadeIn">
          <div className="bg-white p-8 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] max-w-sm w-full text-center border-t-8 border-[#4A0C16] transform transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 opacity-60 bg-repeat-x" style={{ backgroundImage: `url(${okirPattern})`, backgroundSize: 'auto 100%' }} />
            <div className="flex justify-center mb-5">
              <div className="bg-[#FEF9C3] p-4 rounded-2xl shadow-inner border border-[#E09F26]/20">
                <LogOut className="text-[#4A0C16]" size={36} strokeWidth={2} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-[#4A0C16] mb-2 font-serif">Confirm Logout</h2>
            <p className="text-gray-500 text-sm mb-8 font-medium">Are you sure you want to log out of your secure system session?</p>
            <div className="flex gap-4">
              <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-sm transition duration-200 border border-gray-200">Cancel</button>
              <button onClick={handleGlobalLogout} className="flex-1 py-3 px-4 bg-[#4A0C16] hover:bg-[#31080E] text-white font-bold rounded-xl text-sm shadow-[0_4px_15px_rgba(74,12,22,0.3)] border border-[#E09F26]/20 transition duration-200">Yes, Logout</button>
            </div>
          </div>
        </div>
      )}
    </ToastProvider>
  );
};

export default App;