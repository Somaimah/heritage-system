import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const ModeratorHistoryPage = ({ changePage }) => {

  const [items, setItems] = useState([]);

  const loadHistory = async () => {

    const q = query(
      collection(db, "culturalItems"),
      where("status", "!=", "pending")
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
  }, []);

  return (
    <div>
      <h2>Review History</h2>

      {items.length === 0 && <p>No history yet.</p>}

      {items.map(item => (
        <div key={item.id} style={{border:"1px solid black", margin:"10px", padding:"10px"}}>
          <h3>{item.title}</h3>
          <p>Status: {item.status}</p>
        </div>
      ))}

      <br />

      <button onClick={() => changePage("dashboard")}>
        Back to Dashboard
      </button>
    </div>
  );
};

export default ModeratorHistoryPage;