import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";

const Overview = ({ goToLogin, goBack }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const loadApproved = async () => {
      const q = query(
        collection(db, "culturalItems"),
        where("status", "==", "posted")
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(list);
    };

    loadApproved();
  }, []);

  return (
    <div>
      <h2>Guest Overview</h2>
      <p>Limited public content. Log in to view full details.</p>

      {items.length === 0 ? (
        <p>No public items available.</p>
      ) : (
        <div>
          {items.map(item => (
            <div
              key={item.id}
              style={{border:"1px solid black", margin:"10px", padding:"10px", cursor:"pointer"}}
              onClick={goToLogin} // Redirect to login on click
            >
              <h3>{item.title}</h3>
              <p><i>Category: {item.category}</i></p>
              <p>{item.description?.substring(0, 60)}{item.description?.length > 60 ? "..." : ""}</p>
              <p style={{color:"blue"}}>Click to log in for full details</p>
            </div>
          ))}
        </div>
      )}

      <br />

      <button onClick={goToLogin}>
        View Full Content (Login Required)
      </button>

      <button onClick={goBack}>
        Back to Home
      </button>
    </div>
  );
};

export default Overview;