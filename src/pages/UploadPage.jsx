import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase/firebase";
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

const UploadPage = ({ changePage }) => {

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [origin, setOrigin] = useState("");
  const [author, setAuthor] = useState("");
  const [publicationDate, setPublicationDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  const [itemId, setItemId] = useState(null); // to track if editing a returned item

  useEffect(() => {
    const editId = localStorage.getItem("editItemId");
    if (editId) {
      const loadItem = async () => {
        const docRef = doc(db, "culturalItems", editId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTitle(data.title);
          setCategory(data.category);
          setDescription(data.description);
          setOrigin(data.origin || "");
          setAuthor(data.author || "");
          setPublicationDate(data.publicationDate || "");
          setImageUrl(data.imageUrl || "");
          setFileUrl(data.fileUrl || "");
        }
      };
      loadItem();
    }
  }, []);

  const handleUpload = async () => {

    if (!title || !category || !description) {
      alert("Title, category, and description are required.");
      return;
    }

    const editId = localStorage.getItem("editItemId");

if (editId) {
  // Update existing document
  await updateDoc(doc(db, "culturalItems", editId), {
    title,
    category,
    description,
    origin: origin || "",
    author: author || "",
    publicationDate: publicationDate || "",
    imageUrl: imageUrl || "",
    fileUrl: fileUrl || "",
    status: "pending",       // Reset for re-validation
    returnNote: "",          // Clear previous return note
    updatedAt: serverTimestamp()
  });
  localStorage.removeItem("editItemId");
  alert("Submission updated successfully!");
} else {
  // Normal addDoc (new submission)
}

    try {
      if (itemId) {
        // Editing returned item
        await updateDoc(doc(db, "culturalItems", itemId), {
          title,
          category,
          description,
          origin: origin || "",
          author: author || "",
          publicationDate: publicationDate || "",
          imageUrl: imageUrl || "",
          fileUrl: fileUrl || "",
          status: "pending",       // reset to pending
          returnNote: "",          // clear moderator return note
          updatedAt: serverTimestamp()
        });
        alert("Item updated and resubmitted!");
        localStorage.removeItem("editItemId"); // clear the editId
      } else {
        // New submission
        await addDoc(collection(db, "culturalItems"), {
          title,
          category,
          description,
          origin: origin || "",
          author: author || "",
          publicationDate: publicationDate || "",
          imageUrl: imageUrl || "",
          fileUrl: fileUrl || "",
          status: "pending",
          returnNote: "",
          submittedBy: auth.currentUser?.uid,
          createdAt: serverTimestamp(),
          viewCount: 0
        });
        alert("Submission uploaded successfully!");
      }

      // RESET FORM
      setTitle("");
      setCategory("");
      setDescription("");
      setOrigin("");
      setAuthor("");
      setPublicationDate("");
      setImageUrl("");
      setFileUrl("");
      setItemId(null);

    } catch (error) {
      console.error(error);
      alert("Upload failed");
    }
  };

  return (
    <div>

      <h2>{itemId ? "Edit Returned Item" : "Upload Cultural Item"}</h2>

      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <br /><br />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="">Select Category</option>
        <option value="Artifacts">Artifacts</option>
        <option value="Publications">Publications</option>
        <option value="Historical Records">Historical Records</option>
      </select>

      <br /><br />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <br /><br />

      {/* ARTIFACTS */}
      {category === "Artifacts" && (
        <>
          <input
            placeholder="Origin (where it came from)"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
          <br /><br />
          <input
            placeholder="Image URL (artifact picture)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </>
      )}

      {/* PUBLICATIONS */}
      {category === "Publications" && (
        <>
          <input
            placeholder="Author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <br /><br />
          <input
            type="date"
            value={publicationDate}
            onChange={(e) => setPublicationDate(e.target.value)}
          />
          <br /><br />
          <input
            placeholder="Cover Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <br /><br />
          <input
            placeholder="File URL (PDF link)"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
          />
        </>
      )}

      {/* HISTORICAL RECORDS */}
      {category === "Historical Records" && (
        <>
          <input
            placeholder="Fun fact or short historical note"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
          <br /><br />
          <input
            placeholder="Image URL (optional)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </>
      )}

      <br /><br />

      <button onClick={handleUpload}>
        {itemId ? "Update & Resubmit" : "Submit"}
      </button>

      <br /><br />

      <button onClick={() => {
        localStorage.removeItem("editItemId");
        changePage("dashboard");
      }}>
        Back to Dashboard
      </button>

    </div>
  );
};

export default UploadPage;