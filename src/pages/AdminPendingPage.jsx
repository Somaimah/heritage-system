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

  const publishItem = async (id) => {
    await updateDoc(doc(db, "culturalItems", id), {
      status: "posted",
      publishedAt: serverTimestamp()
    });
    alert("Item published");
    loadPendingAdmin();
  };

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
    <div
      style={{
        backgroundColor: "#800000",
        color: "white",
        minHeight: "100vh",
        padding: "90px 20px 20px 20px",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <h2 style={{ fontSize: "2em", marginBottom: "20px" }}>
        Submissions Awaiting Admin Approval
      </h2>

      {items.length === 0 && (
        <p style={{ fontSize: "1.2em" }}>No items waiting for admin approval.</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px"
        }}
      >
        {items.map(item => (
          <div
            key={item.id}
            style={{
              backgroundColor: "white",
              color: "#800000",
              borderRadius: "10px",
              padding: "15px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "220px",
              boxShadow: "0 3px 6px rgba(0,0,0,0.2)",
              transition: "transform 0.3s, box-shadow 0.3s",
              cursor: "pointer"
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 10px 0" }}>{item.title}</h3>
              <p style={{ margin: "0 0 5px 0" }}><b>Category:</b> {item.category}</p>
              <p style={{ margin: "0 0 10px 0" }}>{item.description}</p>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "auto" }}>
              <button
                onClick={() => publishItem(item.id)}
                style={{
                  flex: 1,
                  backgroundColor: "white",
                  color: "#800000",
                  padding: "8px",
                  fontWeight: "bold",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s"
                }}
                onMouseEnter={e => { e.target.style.backgroundColor = "#b30000"; e.target.style.color = "white"; }}
                onMouseLeave={e => { e.target.style.backgroundColor = "white"; e.target.style.color = "#800000"; }}
              >
                Publish
              </button>

              <button
                onClick={() => rejectItem(item.id)}
                style={{
                  flex: 1,
                  backgroundColor: "white",
                  color: "#800000",
                  padding: "8px",
                  fontWeight: "bold",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s"
                }}
                onMouseEnter={e => { e.target.style.backgroundColor = "#b30000"; e.target.style.color = "white"; }}
                onMouseLeave={e => { e.target.style.backgroundColor = "white"; e.target.style.color = "#800000"; }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => changePage("dashboard")}
        style={{
          marginTop: "30px",
          backgroundColor: "white",
          color: "#800000",
          padding: "12px 20px",
          fontWeight: "bold",
          borderRadius: "8px",
          cursor: "pointer",
          border: "none",
          transition: "all 0.3s"
        }}
        onMouseEnter={e => { e.target.style.backgroundColor = "#b30000"; e.target.style.color = "white"; }}
        onMouseLeave={e => { e.target.style.backgroundColor = "white"; e.target.style.color = "#800000"; }}
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default AdminPendingPage;