import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase/firebase";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";

const ReturnedItemsPage = ({ changePage }) => {

  const [items, setItems] = useState([]);
  const [editingItemId, setEditingItemId] = useState(null);

  // Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [origin, setOrigin] = useState("");
  const [author, setAuthor] = useState("");
  const [publicationDate, setPublicationDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [returnNote, setReturnNote] = useState("");

  // Load all returned items submitted by current encoder
  const loadReturnedItems = async () => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "culturalItems"),
      where("status", "==", "returned"),
      where("submittedBy", "==", auth.currentUser.uid)
    );

    const snapshot = await getDocs(q);
    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setItems(list);
  };

  useEffect(() => {
    loadReturnedItems();
  }, []);

  // Start editing
  const startEdit = (item) => {
    setEditingItemId(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setDescription(item.description);
    setOrigin(item.origin || "");
    setAuthor(item.author || "");
    setPublicationDate(item.publicationDate || "");
    setImageUrl(item.imageUrl || "");
    setFileUrl(item.fileUrl || "");
    setReturnNote(item.returnNote || "");
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingItemId(null);
    setTitle("");
    setCategory("");
    setDescription("");
    setOrigin("");
    setAuthor("");
    setPublicationDate("");
    setImageUrl("");
    setFileUrl("");
    setReturnNote("");
  };

  // Submit updated item
  const handleUpdate = async () => {
    if (!title || !category || !description) {
      alert("Title, category, and description are required.");
      return;
    }

    try {
      await updateDoc(doc(db, "culturalItems", editingItemId), {
        title,
        category,
        description,
        origin: origin || "",
        author: author || "",
        publicationDate: publicationDate || "",
        imageUrl: imageUrl || "",
        fileUrl: fileUrl || "",
        status: "pending", // resubmitted for moderator review
        returnNote: "", // clear previous note
        updatedAt: serverTimestamp()
      });

      alert("Item updated and resubmitted!");
      cancelEdit();
      loadReturnedItems();
    } catch (error) {
      console.error(error);
      alert("Failed to update item.");
    }
  };

  return (
    <div>
      <h2>Returned Items</h2>

      {items.length === 0 && <p>No returned items.</p>}

      {items.map(item => (
        <div key={item.id} style={{ border: "1px solid black", margin: "10px", padding: "10px" }}>
          <h3>{item.title}</h3>
          <p><b>Category:</b> {item.category}</p>
          <p><b>Description:</b> {item.description}</p>
          {item.returnNote && <p style={{ color: "red" }}><b>Return Note:</b> {item.returnNote}</p>}

          <button onClick={() => startEdit(item)}>Edit & Resubmit</button>
        </div>
      ))}

      {editingItemId && (
        <div style={{ border: "2px solid blue", margin: "10px", padding: "10px" }}>
          <h3>Editing Item</h3>
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <br /><br />

          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select Category</option>
            <option value="Artifacts">Artifacts</option>
            <option value="Publications">Publications</option>
            <option value="Historical Records">Historical Records</option>
          </select>
          <br /><br />

          <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <br /><br />

          {category === "Artifacts" && (
            <>
              <input placeholder="Origin" value={origin} onChange={(e) => setOrigin(e.target.value)} />
              <br /><br />
              <input placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </>
          )}

          {category === "Publications" && (
            <>
              <input placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
              <br /><br />
              <input type="date" value={publicationDate} onChange={(e) => setPublicationDate(e.target.value)} />
              <br /><br />
              <input placeholder="Cover Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              <br /><br />
              <input placeholder="File URL (PDF link)" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
            </>
          )}

          {category === "Historical Records" && (
            <>
              <input placeholder="Fun fact / Note" value={origin} onChange={(e) => setOrigin(e.target.value)} />
              <br /><br />
              <input placeholder="Image URL (optional)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </>
          )}

          <br /><br />
          <p style={{ color: "red" }}><b>Return Note:</b> {returnNote}</p>

          <button onClick={handleUpdate}>Resubmit</button>
          <button onClick={cancelEdit} style={{ marginLeft: "10px" }}>Cancel</button>
        </div>
      )}

      <br />
      <button onClick={() => changePage("dashboard")}>Back to Dashboard</button>
    </div>
  );
};

export default ReturnedItemsPage;