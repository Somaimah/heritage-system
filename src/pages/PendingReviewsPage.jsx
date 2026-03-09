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

const PendingReviewsPage = ({ changePage, user }) => {

  const [items, setItems] = useState([]);

  const loadPending = async () => {

    const q = query(
      collection(db, "culturalItems"),
      where("status", "==", "pending")
    );

    const snapshot = await getDocs(q);

    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setItems(list);
  };

  useEffect(() => {
    loadPending();
  }, []);

  // VALIDATE (Moderator approves metadata)
  const validateItem = async (id) => {

    await updateDoc(doc(db, "culturalItems", id), {
      status: "validated",
      moderatorId: user?.uid || "",
      moderatorEmail: user?.email || "unknown",
      reviewedAt: serverTimestamp(),
      returnNote: ""
    });

    alert("Item validated");
    loadPending();
  };

  // RETURN WITH NOTE
  const returnItem = async (id) => {

    const note = prompt("Reason for return:");

    if (!note) {
      alert("Return note is required.");
      return;
    }

    await updateDoc(doc(db, "culturalItems", id), {
      status: "returned",
      moderatorId: user?.uid || "",
      moderatorEmail: user?.email || "unknown",
      reviewedAt: serverTimestamp(),
      returnNote: note
    });

    alert("Item returned");
    loadPending();
  };

  return (
    <div>

      <h2>Pending Reviews</h2>

      {items.length === 0 && <p>No pending submissions.</p>}

      {items.map(item => (

        <div
          key={item.id}
          style={{border:"1px solid black", padding:"10px", margin:"10px"}}
        >

          <p><b>Title:</b> {item.title}</p>
          <p><b>Category:</b> {item.category}</p>
          <p><b>Description:</b> {item.description}</p>

          <button onClick={() => validateItem(item.id)}>
            Validate
          </button>

          <button onClick={() => returnItem(item.id)}>
            Return
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

export default PendingReviewsPage;