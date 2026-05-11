import { db, storage } from "../firebase/firebase";
import {
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";


// ============================
// 🔹 OPTIONAL FILE UPLOADS
// ============================

export const uploadImage = async (file) => {
  if (!file) return "";

  const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};

export const uploadPDF = async (file) => {
  if (!file) return "";

  const storageRef = ref(storage, `pdfs/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};


// ============================
// 🔹 MAIN CREATE ITEM (GATEWAY)
// ============================

export const createItem = async (data, user) => {
  if (!user) {
    throw new Error("User not authenticated");
  }

  // 🔒 BASIC VALIDATION
  if (!data.title || !data.description) {
    throw new Error("Title and description are required");
  }

  // 🧼 CLEAN DATA (remove empty values)
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined && v !== "")
  );

  // 🧱 NORMALIZED STRUCTURE
  const finalData = {
    ...cleanData,

    // SYSTEM FIELDS
    status: "pending",
    createdAt: serverTimestamp(),
    createdBy: user.uid,
    encoderId: user.uid,
    submittedBy: user.uid,

    // DEFAULTS (safety)
    category: data.category || "Artifact"
  };

  // 🚀 SAVE TO FIRESTORE
  const docRef = await addDoc(collection(db, "culturalItems"), finalData);

  return docRef;
};