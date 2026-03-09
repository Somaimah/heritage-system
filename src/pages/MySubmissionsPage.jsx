import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

const MySubmissionsPage = ({ changePage }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchItems = async () => {
      if (!auth.currentUser) return;

      const q = query(
        collection(db, "culturalItems"),
        where("submittedBy", "==", auth.currentUser.uid)
      );

      const querySnapshot = await getDocs(q);

      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setItems(data);
    };

    fetchItems();
  }, []);

  return (
    <div>
      <h2>My Submissions</h2>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
            <th>Return Note</th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan="4">No submissions yet.</td>
            </tr>
          )}

          {items.map(item => (
            <tr key={item.id}>
              <td>{item.title}</td>
              <td>{item.category}</td>
              <td>{item.status}</td>
              <td>{item.returnNote || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <br />

      <button onClick={() => changePage("dashboard")}>
        Back to Dashboard
      </button>
    </div>
  );
};

export default MySubmissionsPage;