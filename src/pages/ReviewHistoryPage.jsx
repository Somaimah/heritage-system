import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const ReviewHistoryPage = ({ changePage, user }) => {

  const [items, setItems] = useState([]);

  const loadHistory = async () => {

    if (!user) return;

    const q = query(
      collection(db, "culturalItems"),
      where("moderatorId", "==", user.uid)
    );

    const snapshot = await getDocs(q);

    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setItems(list);
  };

  useEffect(() => {
    loadHistory();
  }, [user]);

  return (
    <div>

      <h2>Review History</h2>

      {items.length === 0 && <p>No reviewed items.</p>}

      {items.map(item => (
        <div key={item.id} style={{border:"1px solid black", margin:"10px", padding:"10px"}}>
          <p><b>Title:</b> {item.title}</p>
          <p><b>Status:</b> {item.status}</p>

          {item.returnNote && (
            <p><b>Return Note:</b> {item.returnNote}</p>
          )}
        </div>
      ))}

      <button onClick={() => changePage("dashboard")}>
        Back
      </button>

    </div>
  );
};

export default ReviewHistoryPage;