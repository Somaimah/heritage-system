import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase/firebase";
import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment } from "firebase/firestore";

const ItemDetailPage = ({ changePage, itemId, fromPage }) => {

  const [item, setItem] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {

    const loadItem = async () => {
      const snap = await getDoc(doc(db, "culturalItems", itemId));

      if (snap.exists()) {
        setItem({ id: snap.id, ...snap.data() });
      }
    };

    const checkBookmark = async () => {
      if (!auth.currentUser) return;

      const bookmarkId = `${auth.currentUser.uid}_${itemId}`;
      const snap = await getDoc(doc(db, "bookmarks", bookmarkId));

      if (snap.exists()) {
        setBookmarked(true);
      }
    };

    const incrementView = async () => {
      try {
        await updateDoc(doc(db, "culturalItems", itemId), {
          viewCount: increment(1)
        });
      } catch (err) {
        console.error("View count update failed:", err);
      }
    };

    loadItem();
    checkBookmark();
    incrementView();

  }, [itemId]);

  const toggleBookmark = async () => {

    setError("");

    if (!auth.currentUser) {
      alert("You must be logged in.");
      return;
    }

    if (!item) return;

    try {

      const bookmarkId = `${auth.currentUser.uid}_${item.id}`;
      const bookmarkRef = doc(db, "bookmarks", bookmarkId);

      if (bookmarked) {
        await deleteDoc(bookmarkRef);
        setBookmarked(false);
        alert("Bookmark removed");
      } else {
        await setDoc(bookmarkRef, {
          userId: auth.currentUser.uid,
          itemId: item.id,
          title: item.title,
          category: item.category,
          createdAt: new Date()
        });
        setBookmarked(true);
        alert("Bookmarked");
      }

    } catch (err) {
      console.error("Bookmark Error:", err);
      setError("Bookmark action failed.");
    }
  };

  if (!item) return <p>Loading...</p>;

  return (
    <div>

      <h2>{item.title}</h2>

      <p><b>Category:</b> {item.category}</p>

      {item.origin && <p><b>Origin:</b> {item.origin}</p>}
      {item.author && <p><b>Author:</b> {item.author}</p>}
      {item.publicationDate && <p><b>Publication Date:</b> {item.publicationDate}</p>}

      <p>{item.description}</p>

      {item.imageUrl && (
        <div>
          <img src={item.imageUrl} alt="item" style={{ width: "200px" }} />
        </div>
      )}

      {item.fileUrl && (
        <p>
          <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
            View Document
          </a>
        </p>
      )}

      <button onClick={toggleBookmark} style={{ fontSize: "24px" }}>
        {bookmarked ? "★ Bookmarked" : "☆ Bookmark"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <br /><br />
      <button onClick={() => changePage(fromPage || "search")}>
        Back
      </button>

    </div>
  );
};

export default ItemDetailPage;