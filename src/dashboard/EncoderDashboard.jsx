import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";

const EncoderDashboard = ({ changePage }) => {

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("page");
    changePage("landing");
  };

  return (
    <div>
      <h2>Encoder Dashboard</h2>

      <button onClick={() => changePage("upload")}>
        Upload Item
      </button>

      <button onClick={() => changePage("returnedItems")}>
        Returned Submissions
      </button>

      <button onClick={() => changePage("mysubmissions")}>
        View Submission Status
      </button>

      <br /><br />

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
};

export default EncoderDashboard;