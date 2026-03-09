import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";

const ModeratorDashboard = ({ changePage }) => {

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("page");
    changePage("landing");
  };

  return (
    <div>
      <h2>Moderator Dashboard</h2>

      <button onClick={() => changePage("pendingreviews")}>
        Pending Submissions
      </button>

      <button onClick={() => changePage("reviewhistory")}>
        Review History
      </button>

      <br /><br />

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
};

export default ModeratorDashboard;