import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";

const BookmarkPage = ({ changePage }) => {

  const [bookmarks, setBookmarks] = useState([]);

  const loadBookmarks = async () => {

    if (!auth.currentUser) return;

    const q = query(
      collection(db, "bookmarks"),
      where("userId", "==", auth.currentUser.uid)
    );

    const snapshot = await getDocs(q);

    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setBookmarks(list);
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const removeBookmark = async (id) => {

    await deleteDoc(doc(db, "bookmarks", id));
    alert("Removed");
    loadBookmarks();
  };

  return (
    <div>
      <h2>My Bookmarks</h2>

      {bookmarks.length === 0 && <p>No bookmarks yet.</p>}

      {bookmarks.map(item => (

        <div
          key={item.id}
          style={{ border: "1px solid black", margin: "10px", padding: "10px" }}
        >

          <h3>★ {item.title}</h3>
          <p>Category: {item.category}</p>

          <button onClick={() => {
          localStorage.setItem("itemId", item.itemId);
          localStorage.setItem("fromPage", "bookmarks"); // tell ItemDetailPage where we came from
          changePage("itemdetail");
      }}>
            View
          </button>

          <button onClick={() => removeBookmark(item.id)}>
            Remove
          </button>

        </div>

      ))}

      <button onClick={() => changePage("dashboard")}>
        Back to Dashboard
      </button>
    </div>
  );
};

export default BookmarkPage;