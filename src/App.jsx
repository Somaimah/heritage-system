import { useTranslation } from 'react-i18next';
import React, { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import Loader from "./components/Loader";
import { useSessionStorage } from "./hooks/useSessionStorage";
// 🔔 Notification System Context Integration
import { ToastProvider } from "./contexts/ToastContext";

// Auth
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// Dashboards
import UserDashboard from "./pages/dashboard/UserDashboard";
import EncoderDashboard from "./pages/dashboard/EncoderDashboard";
import ModeratorDashboard from "./pages/dashboard/ModeratorDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";

// Pages
import LandingPage from "./pages/LandingPage";
import Overview from "./pages/dashboard/Overview";
import UploadPage from "./pages/items/ItemUploadPage";
import ProverbUploadPage from "./pages/proverbs/ProverbUploadPage"; 
import ItemDetailPage from "./pages/items/ItemDetailPage";
import NotificationsPage from "./pages/NotificationsPage";
import BookmarkPage from "./pages/BookmarkPage";
import ProverbPosted from "./pages/proverbs/ProverbPosted";
import ProverbDetailPage from "./pages/proverbs/ProverbDetailPage";

// Lucide icon for the unified confirmation modal
import { LogOut } from "lucide-react";
import okirPattern from "./assets/okir-pattern.png"; 

const App = () => {
  const { t, i18n } = useTranslation();

  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ MAGIC HAPPENS HERE: useSessionStorage perfectly handles saving and loading for us.
  const [page, setPage] = useSessionStorage("saved_page", "landing");
  const [pageData, setPageData] = useSessionStorage("saved_page_data", {});

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const pageRef = useRef(page);

  const changePage = (newPage, data = {}) => {
    if ((newPage === "itemdetail" || newPage === "proverbdetail" || newPage === "upload") && !data.fromPage) {
      data.fromPage = pageRef.current; 
    }
    setPage(newPage);
    pageRef.current = newPage;
    setPageData(data);
  };

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // ================= UNIFIED GLOBAL LOGOUT ACTIONS =================
  const handleGlobalLogout = async () => {
    try {
      // 1. Reset Language
      await i18n.changeLanguage('en');
      localStorage.removeItem('i18nextLng');
      
      // 2. Clear ALL session data (This wipes the 'saved_page' AND any tab states in the dashboards)
      sessionStorage.clear(); 
      
      // 3. Clear specific registration flags
      localStorage.removeItem("isRegistering");

      // 4. Force state to landing to ensure no re-saves happen
      setPage("landing");
      pageRef.current = "landing";
      
      setIsLogoutModalOpen(false);
      
      // 5. Sign out from Firebase
      await signOut(auth);
      
      // 6. HARD RESET: This forces the browser to dump all memory and reload from scratch
      window.location.replace("/"); 
    } catch (err) {
      console.error("Global Logout error:", err);
    }
  };

  const triggerLogoutModal = () => {
    setIsLogoutModalOpen(true);
  };

  // ================= SECURE ROUTE & SESSION KEEP ALIVE =================
  useEffect(() => {
    let isInitialAuthCheck = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          const isRegistering = localStorage.getItem("isRegistering");
          
          if (pageRef.current === "register") {
            setLoading(false);
            isInitialAuthCheck = false;
            return; 
          } else if (isRegistering === "true") {
            localStorage.removeItem("isRegistering");
          }

          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          setUser(currentUser);
          const userRole = userDoc.exists() ? userDoc.data().role : "user";
          
          setRole(userRole);

          if (pageRef.current === "landing" || pageRef.current === "login") {
            changePage("dashboard");
          }
        } else {
          setUser(null);
          setRole("guest");
          
          if (!isInitialAuthCheck) {
            if (!["register", "login", "overview", "landing"].includes(pageRef.current)) {
              changePage("landing");
            }
          }
        }
      } catch (error) {
        console.error("Auth Listener Error:", error);
        
        if (currentUser) {
          setUser(currentUser);
          setRole("user"); 
          if (pageRef.current === "landing" || pageRef.current === "login") {
            changePage("dashboard");
          }
        } else {
          setUser(null);
          setRole("guest");
          changePage("landing");
        }
      } finally {
        isInitialAuthCheck = false;
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
        <ProverbPosted role={role} changePage={changePage} />
      )}
      
      {page === "landing" && <LandingPage changePage={changePage} />}
      {page === "login" && <Login goToRegister={() => changePage("register")} goBack={() => changePage("landing")} />}
      {page === "register" && <Register goBackToLogin={() => changePage("login")} />}
      {page === "overview" && <Overview changePage={changePage} />}
      
      {page === "upload" && (
        <UploadPage changePage={changePage} editItem={pageData?.editItem} />
      )}

      {page === "proverbdetail" && (
        <ProverbDetailPage 
          changePage={changePage} 
          itemId={pageData?.itemId} 
          fromPage={pageData?.fromPage || "dashboard"} 
          role={role} 
        />
      )}

      {page === "uploadProverb" && (
        <ProverbUploadPage changePage={changePage} user={user} editItem={pageData?.editItem} />
      )}
      
      {page === "itemdetail" && (
        <ItemDetailPage 
          changePage={changePage} 
          itemId={pageData?.itemId} 
          itemType={pageData?.itemType} 
          fromPage={pageData?.fromPage || "dashboard"} 
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

      {!["notifications", "proverb", "proverbdetail", "bookmarks", "landing", "login", "register", "overview", "upload", "uploadProverb", "itemdetail", "dashboard"].includes(page) && (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4">
          <h1 className="text-4xl font-bold text-[#4A0C16] mb-2">Error: Page not found</h1>
          <p className="text-gray-500 mb-6 font-medium">It looks like the system got lost.</p>
          <button 
            onClick={() => changePage("dashboard")} 
            className="px-6 py-3 bg-[#E09F26] text-white font-bold rounded-xl shadow-md hover:bg-[#cf9021] transition-all"
          >
            Return to Dashboard
          </button>
        </div>
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