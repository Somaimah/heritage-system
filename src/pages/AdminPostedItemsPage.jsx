import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const AdminPostedItemsPage = ({ changePage }) => {

  const [items, setItems] = useState([]);

  const loadPosted = async () => {

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

  useEffect(() => {
    loadPosted();
  }, []);

  return (
    <div>

      <h2>All Posted Cultural Items</h2>

      {items.length === 0 && <p>No posted items yet.</p>}

      {items.map(item => (

        <div
          key={item.id}
          style={{border:"1px solid black", margin:"10px", padding:"10px"}}
        >

          <h3>{item.title}</h3>
          <p><b>Category:</b> {item.category}</p>
          <p>{item.description}</p>

        </div>

      ))}

      <br />

      <button onClick={() => changePage("dashboard")}>
        Back
      </button>

    </div>
  );
};

export default AdminPostedItemsPage;