import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase/firebase";
import { notifyRole } from "../../services/notificationService";
import {
  collection,
  addDoc,
  doc,          // <-- ADDED
  updateDoc,    // <-- ADDED
  serverTimestamp
} from "firebase/firestore";

// ADDED: Accept `editItem` as a prop
const UploadPage = ({ changePage, editItem }) => {
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("Artifact");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [origin, setOrigin] = useState("");
  const [author, setAuthor] = useState("");
  const [recordType, setRecordType] = useState("Fun Fact");

  const [imageUrl, setImageUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  // ================= PRE-FILL FORM FOR EDITING =================
  useEffect(() => {
    if (editItem) {
      setCategory(editItem.category || "Artifact");
      setTitle(editItem.title || "");
      setDescription(editItem.description || "");
      setOrigin(editItem.origin || "");
      setAuthor(editItem.author || "");
      setRecordType(editItem.recordType || "Fun Fact");
      setImageUrl(editItem.imageUrl || "");
      setFileUrl(editItem.fileUrl || "");
    }
  }, [editItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      if (!auth.currentUser) {
        alert("User not logged in");
        setLoading(false);
        return;
      }
  
      const data = {
        title,
        description,
        category,
        imageUrl,
        fileUrl,
        ...(category === "Artifact" && { origin }),
        ...(category === "Publication" && { author }),
        ...(category === "Historical Records" && { recordType }),
        status: "pending", // Sends it back to the moderator
      };
  
      if (editItem) {
        // ================= EDIT MODE (NO DUPLICATES) =================
        const itemRef = doc(db, "culturalItems", editItem.id);
        
        // Add updated timestamp
        data.updatedAt = serverTimestamp();
        
        await updateDoc(itemRef, data);

        // Notify Moderator about the resubmission
        try {
          await notifyRole({
            role: "moderator",
            message: `Item resubmitted by encoder: ${title}`,
            type: "upload",
            itemId: editItem.id
          });
        } catch (notifError) {
          console.log("Notification failed:", notifError);
        }

        alert("Item successfully updated and resubmitted!");

      } else {
        // ================= NORMAL UPLOAD MODE =================
        data.createdAt = serverTimestamp();
        data.createdBy = auth.currentUser.uid;
        data.createdByEmail = auth.currentUser.email;
        data.encoderId = auth.currentUser.uid;

        const docRef = await addDoc(collection(db, "culturalItems"), data);
  
        try {
          await notifyRole({
            role: "moderator",
            message: `New item uploaded: ${title}`,
            type: "upload",
            itemId: docRef.id
          });
        } catch (notifError) {
          console.log("Notification failed:", notifError);
        }
  
        alert("Upload successful!");
      }

      changePage("dashboard");
  
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      alert(err.message);
    }
  
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f5dc] p-10">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-md">

        <div className="flex justify-between mb-6">
          {/* Dynamic Header */}
          <h1 className="text-2xl font-bold text-[#800000]">
            {editItem ? "Edit & Resubmit Item" : "Upload Item"}
          </h1>
          <button onClick={() => changePage("dashboard")} className="bg-gray-200 px-4 py-2 rounded-lg">
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border p-3 rounded">
            <option>Artifact</option>
            <option>Publication</option>
            <option>Historical Records</option>
          </select>

          <input className="w-full border p-3 rounded" placeholder="Title"
            value={title} onChange={(e) => setTitle(e.target.value)} required />

          <textarea className="w-full border p-3 rounded" placeholder="Description"
            value={description} onChange={(e) => setDescription(e.target.value)} required />

          {category === "Artifact" && (
            <input className="w-full border p-3 rounded" placeholder="Origin"
              value={origin} onChange={(e) => setOrigin(e.target.value)} />
          )}

          {category === "Publication" && (
            <input className="w-full border p-3 rounded" placeholder="Author"
              value={author} onChange={(e) => setAuthor(e.target.value)} />
          )}

          {category === "Historical Records" && (
            <select className="w-full border p-3 rounded"
              value={recordType} onChange={(e) => setRecordType(e.target.value)}>
              <option>Fun Fact</option>
              <option>Book</option>
            </select>
          )}

          <input className="w-full border p-3 rounded" placeholder="Image URL"
            value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />

          <input className="w-full border p-3 rounded" placeholder="PDF URL"
            value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />

          <button type="submit" disabled={loading}
            className="w-full bg-[#800000] text-white py-3 rounded-lg font-bold">
            {/* Dynamic Button Text */}
            {loading ? "Saving..." : (editItem ? "Resubmit Item" : "Upload Item")}
          </button>

        </form>
      </div>
    </div>
  );
};

export default UploadPage;