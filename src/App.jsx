import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

// Pages & dashboards
import Login from "./auth/Login";
import Register from "./auth/Register";
import Dashboard from "./dashboard/Dashboard";
import Overview from "./overview/Overview";
import EncoderDashboard from "./dashboard/EncoderDashboard";
import ModeratorDashboard from "./dashboard/ModeratorDashboard";
import AdminDashboard from "./dashboard/AdminDashboard";

import UploadPage from "./pages/UploadPage";
import MySubmissionsPage from "./pages/MySubmissionsPage";
import PendingReviewsPage from "./pages/PendingReviewsPage";
import SearchPage from "./pages/SearchPage";
import BookmarkPage from "./pages/BookmarkPage";
import ReviewHistoryPage from "./pages/ReviewHistoryPage";
import ItemDetailPage from "./pages/ItemDetailPage";
import AdminUsersPage from "./admin/AdminUsersPage";
import AdminAnalyticsPage from "./admin/AdminAnalyticsPage";
import AdminPendingPage from "./pages/AdminPendingPage";
import AdminPostedItemsPage from "./pages/AdminPostedItemsPage";
import ReturnedItemsPage from "./pages/ReturnedItemsPage";

const App = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  // Persist current page across refresh
  const [page, setPage] = useState(localStorage.getItem("page") || "landing");

  const changePage = (newPage) => {
    setPage(newPage);
    localStorage.setItem("page", newPage);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          setRole(userDoc.exists() ? userDoc.data().role : "user");

          const savedPage = localStorage.getItem("page");
          if (savedPage) setPage(savedPage);
          else setPage("dashboard");
        } catch (error) {
          console.error(error);
          setRole("user");
          setPage("dashboard");
        }
      } else {
        setUser(null);
        setRole(null);
        setPage("landing");
        localStorage.removeItem("page");
      }
    });

    return () => unsubscribe();
  }, []);

  // ------------------- PAGE RENDERING -------------------

  // Landing page
  if (page === "landing") {
    return (
      <div>
        <h2>Welcome</h2>
        <button onClick={() => changePage("login")}>Login</button>
        <button onClick={() => changePage("overview")}>Continue as Guest</button>
      </div>
    );
  }

  if (page === "adminposted") return <AdminPostedItemsPage changePage={changePage} />;

  // Login / Register
  if (page === "login") return <Login goToRegister={() => changePage("register")} goBack={() => changePage("landing")} />;
  if (page === "register") return <Register goBackToLogin={() => changePage("login")} />;

  // Guest overview
  if (page === "overview") return <Overview goToLogin={() => changePage("login")} goBack={() => changePage("landing")} />;

  // Upload page
  if (page === "upload") return <UploadPage changePage={changePage} />;

  // My submissions (encoder)
  if (page === "mysubmissions") return <MySubmissionsPage changePage={changePage} />;

  // Search / bookmarks
  if (page === "search") return <SearchPage changePage={changePage} />;
  if (page === "bookmarks") return <BookmarkPage changePage={changePage} />;

  // Item details
  if (page === "itemdetail") {
    const fromPage = localStorage.getItem("fromPage") || "dashboard";
    return <ItemDetailPage changePage={changePage} itemId={localStorage.getItem("itemId")} fromPage={fromPage} />;
  }

  // Returned items (encoder)
  if (page === "returnedItems") return <ReturnedItemsPage changePage={changePage} />;

  // Moderator review pages
  if (page === "pendingreviews") return <PendingReviewsPage changePage={changePage} user={user} />;
  if (page === "reviewhistory") return <ReviewHistoryPage changePage={changePage} user={user} />;

  // Admin pages
  if (page === "adminusers") return <AdminUsersPage changePage={changePage} />;
  if (page === "adminanalytics") return <AdminAnalyticsPage changePage={changePage} />;
  if (page === "adminpending") return <AdminPendingPage changePage={changePage} />;

  // ------------------- DASHBOARDS -------------------
  if (page === "dashboard") {
    if (role === "encoder") return <EncoderDashboard user={user} changePage={changePage} />;
    if (role === "moderator") return <ModeratorDashboard changePage={changePage} />;
    if (role === "admin") return <AdminDashboard changePage={changePage} />;

    return <Dashboard user={user} role={role} changePage={changePage} />;
  }

  // Fallback
  return <div>Page not found</div>;
};

export default App;