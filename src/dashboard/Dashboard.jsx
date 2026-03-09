import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";

const Dashboard = ({ user, role, changePage }) => {

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("page");
    changePage("landing");
  };

  return (
    <div>
      <h2>Dashboard</h2>
      <p>Welcome: {user?.email}</p>
      <p>Your role: {role}</p>

      <button onClick={() => changePage("bookmarks")}>
        My Bookmarks
      </button>

      <button onClick={() => changePage("search")}>
        Search Cultural Items
      </button>

      {role === "admin" && (
        <button onClick={() => changePage("adminusers")}>
          User Management
        </button>
      )}

      <br /><br />

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
};

export default Dashboard;