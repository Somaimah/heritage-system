import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where
} from "firebase/firestore";

import { db } from "../firebase/firebase";

// SEND TO SPECIFIC USER
export const sendNotification = async ({
  userId,
  message,
  type = "",
  itemId = ""
}) => {
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      message,
      type,
      itemId,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error(err);
  }
};

// SEND TO ROLE
export const notifyRole = async ({
  role,
  message,
  type = "",
  itemId = ""
}) => {
  try {
    const q = query(
      collection(db, "users"),
      where("role", "==", role)
    );

    const snap = await getDocs(q);

    for (const userDoc of snap.docs) {
      await addDoc(collection(db, "notifications"), {
        userId: userDoc.id,
        message,
        type,
        itemId,
        read: false,
        createdAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.error(err);
  }
};