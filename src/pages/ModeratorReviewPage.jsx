import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";

const ModeratorReviewPage = ({ changePage }) => {

  const [items, setItems] = useState([]);
  const [note, setNote] = useState("");

  const loadPending = async () => {

    const q = query(
      collection(db, "culturalItems"),
      where("status", "==", "pending_moderator")
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

  const approve = async (id) => {

    await updateDoc(doc(db, "culturalItems", id), {
      status: "pending_admin",
      moderatorNote: "",
      reviewedBy: auth.currentUser.uid,
      reviewedAt: serverTimestamp()
    });

    alert("Approved and sent to Admin");
    loadPending();
  };

  const returnToEncoder = async (id) => {

    if (!note) {
      alert("Please enter a return note.");
      return;
    }

    await updateDoc(doc(db, "culturalItems", id), {
      status: "returned",
      moderatorNote: note,
      reviewedBy: auth.currentUser.uid,
      reviewedAt: serverTimestamp()
    });

    alert("Returned to encoder");
    setNote("");
    loadPending();
  };

  return (
    <div>

      <h2>Moderator Review</h2>

      {items.length === 0 && <p>No items for review.</p>}

      {items.map(item => (

        <div key={item.id} style={{border:"1px solid black", margin:"10px", padding:"10px"}}>

          <h3>{item.title}</h3>
          <p>{item.description}</p>

          <textarea
            placeholder="Return note (if returning to encoder)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <br /><br />

          <button onClick={() => approve(item.id)}>
            Approve
          </button>

          <button onClick={() => returnToEncoder(item.id)}>
            Return to Encoder
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

export default ModeratorReviewPage;