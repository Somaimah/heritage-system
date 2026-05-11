import React, { useEffect, useState, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

// Auth
import Login from "./auth/Login";
import Register from "./auth/Register";

// Dashboards
import UserDashboard from "./pages/dashboard/UserDashboard";
import EncoderDashboard from "./pages/dashboard/EncoderDashboard";
import ModeratorDashboard from "./pages/dashboard/ModeratorDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";

// Pages
import Overview from "./overview/Overview";
import UploadPage from "./pages/shared/UploadPage";
import ItemDetailPage from "./pages/shared/ItemDetailPage";
import NotificationsPage from "./pages/shared/NotificationsPage";
import BookmarkPage from "./pages/shared/BookmarkPage";

const App = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState("landing");
  const [pageData, setPageData] = useState({});

  const pageRef = useRef(page);

  const changePage = (newPage, data = {}) => {
    setPage(newPage);
    pageRef.current = newPage; 
    setPageData(data);
  };

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

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
          setRole(userRole);
          setPage("dashboard");

        } else {
          
          setUser(null);
          setRole("guest");
      
          setPage((prevPage) => {
            if (prevPage === "register" || prevPage === "login") return prevPage;
            return "landing";
          });
        }
      } catch (error) {
        console.error("Auth Listener Error:", error);
        setUser(null);
        setRole("guest");
        setPage((prevPage) => {
          if (prevPage === "register" || prevPage === "login") return prevPage;
          return "landing";
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#800000] text-white flex items-center justify-center text-2xl font-sans">
        Loading...
      </div>
    );
  }

  if (page === "notifications") return <NotificationsPage changePage={changePage} />;
  if (page === "bookmarks") return <BookmarkPage changePage={changePage} />;

  if (page === "landing") {
    return (
      <div className="min-h-screen bg-[#f5f5dc]">
        <header className="bg-[#800000] text-white px-10 py-5 flex justify-between items-center shadow-md">
          <div>
            <h1 className="text-2xl font-bold">MSU Meranaw Cultural Heritage Center</h1>
            <p className="text-sm text-gray-200">Digital Heritage Archive System</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => changePage("login")} className="px-5 py-2 bg-white text-[#800000] font-semibold rounded-lg hover:bg-gray-100 transition">
              Login
            </button>
            <button onClick={() => changePage("register")} className="px-5 py-2 bg-[#D4A017] text-white font-semibold rounded-lg hover:bg-[#b58812] transition">
              Register
            </button>
          </div>
        </header>

        <section className="text-center py-24">
          <h1 className="text-5xl font-bold text-[#800000] mb-8">Preserve Meranaw Cultural Heritage</h1>
          <button onClick={() => changePage("overview")} className="mt-10 px-8 py-4 bg-[#800000] hover:bg-[#600000] text-white font-bold rounded-xl shadow-lg transition">
            Explore Archive
          </button>
        </section>
      </div>
    );
  }

  if (page === "login") return <Login goToRegister={() => changePage("register")} goBack={() => changePage("landing")} />;
  if (page === "register") return <Register goBackToLogin={() => changePage("login")} />;
  if (page === "overview") return <Overview changePage={changePage} />;
  if (page === "upload") return <UploadPage changePage={changePage} editItem={pageData.editItem} />
  if (page === "itemdetail") return <ItemDetailPage changePage={changePage} itemId={pageData.itemId} fromPage={pageData.fromPage} role={role} />;
  
  if (page === "dashboard") {
    if (role === "encoder") return <EncoderDashboard user={user} changePage={changePage} />;
    if (role === "moderator") return <ModeratorDashboard user={user} changePage={changePage} />;
    if (role === "admin") return <AdminDashboard user={user} changePage={changePage} />;
    return <UserDashboard user={user} changePage={changePage} />;
  }

  return <div className="min-h-screen flex items-center justify-center text-red-600 font-bold text-xl">Page not found</div>;
};

export default App;