import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";

const AdminDashboard = ({ changePage }) => {

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("page");
    changePage("landing");
  };

  return (
    <div>
      <h2>Administrator Dashboard</h2>

      <button onClick={() => changePage("adminpending")}>
        Validated Submissions
      </button>

      <button onClick={() => changePage("adminanalytics")}>
        Analytics
      </button>

      <button onClick={() => changePage("adminposted")}>
        View Posted Items
      </button>

      <button onClick={() => changePage("adminusers")}>
        User Management
      </button>

      <br /><br />

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
};

export default AdminDashboard;