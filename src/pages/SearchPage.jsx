import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase/firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";

const SearchPage = ({ changePage }) => {

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // LOAD POSTED ITEMS
  const loadItems = async () => {

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
    loadItems();
  }, []);

  // BOOKMARK FUNCTION
  const bookmark = async (item) => {

    if (!auth.currentUser) {
      alert("You must be logged in.");
      return;
    }

    const bookmarkId = `${auth.currentUser.uid}_${item.id}`;

    await setDoc(doc(db, "bookmarks", bookmarkId), {
      userId: auth.currentUser.uid,
      itemId: item.id,
      title: item.title,
      category: item.category,
      createdAt: new Date()
    });

    alert("Bookmarked!");
  };

  // 🔎 FILTER ITEMS (SEARCH + CATEGORY)
  const filteredItems = items.filter(item => {

    const matchSearch = item.title
      ?.toLowerCase()
      .includes(search.toLowerCase());

    const matchCategory =
      categoryFilter === "" || item.category === categoryFilter;

    return matchSearch && matchCategory;
  });

  return (
    <div style={{ padding: "20px" }}>

      <h2>Search Cultural Items</h2>

      {/* SEARCH BAR */}
      <input
        type="text"
        placeholder="Search by title..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: "8px", width: "250px", marginRight: "10px" }}
      />

      {/* CATEGORY FILTER */}
      <select
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        style={{ padding: "8px" }}
      >
        <option value="">All Categories</option>
        <option value="Artifacts">Artifacts</option>
        <option value="Publications">Publications</option>
        <option value="Historical Records">Historical Records</option>
      </select>

      <br /><br />

      {filteredItems.length === 0 && <p>No items found.</p>}

      {filteredItems.map(item => (

        <div
          key={item.id}
          style={{
            border: "1px solid #ccc",
            borderRadius: "8px",
            marginBottom: "15px",
            padding: "15px"
          }}
        >

          <h3>{item.title}</h3>

          <p>
            <b>Category:</b> {item.category}
          </p>

          <p>{item.description}</p>

          <button onClick={() => {
            localStorage.setItem("itemId", item.id);
            localStorage.setItem("fromPage", "search");
            changePage("itemdetail");
          }}>
            View
          </button>

          <button
            onClick={() => bookmark(item)}
            style={{ marginLeft: "10px" }}
          >
            Bookmark
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

export default SearchPage;