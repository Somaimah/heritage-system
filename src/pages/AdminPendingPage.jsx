import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";

const AdminPendingPage = ({ changePage }) => {

  const [items, setItems] = useState([]);

  const loadPendingAdmin = async () => {
    // Only items approved by moderator
    const q = query(
      collection(db, "culturalItems"),
      where("status", "==", "pending_admin")
    );

    const snapshot = await getDocs(q);

    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setItems(list);
  };

  useEffect(() => {
    loadPendingAdmin();
  }, []);

  // PUBLISH (Admin approves for public)
  const publishItem = async (id) => {
    await updateDoc(doc(db, "culturalItems", id), {
      status: "posted",
      publishedAt: serverTimestamp()
    });

    alert("Item published");
    loadPendingAdmin();
  };

  // REJECT (Admin rejects permanently)
  const rejectItem = async (id) => {
    const reason = prompt("Reason for rejection:");

    if (!reason) {
      alert("Rejection reason is required.");
      return;
    }

    await updateDoc(doc(db, "culturalItems", id), {
      status: "rejected",
      adminNote: reason,
      reviewedAt: serverTimestamp()
    });

    alert("Item rejected");
    loadPendingAdmin();
  };

  return (
    <div>
      <h2>Submissions Awaiting Admin Approval</h2>

      {items.length === 0 && <p>No items waiting for admin approval.</p>}

      {items.map(item => (
        <div key={item.id} style={{border:"1px solid black", margin:"10px", padding:"10px"}}>
          <p><b>Title:</b> {item.title}</p>
          <p><b>Category:</b> {item.category}</p>
          <p><b>Description:</b> {item.description}</p>

          <button onClick={() => publishItem(item.id)}>
            Publish
          </button>

          <button onClick={() => rejectItem(item.id)}>
            Reject
          </button>
        </div>
      ))}

      <br />

      <button onClick={() => changePage("dashboard")}>
        Back to Dashboard
      </button>
    </div>
  );
};

export default AdminPendingPage;