import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

/**
 * Sends a notification document to a single specific user account.
 */
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
    console.error("Failed to send individual notification:", err);
    throw err;
  }
};

/**
 * Broadcasts a notification to a specific role (e.g., "admin", "moderator", "user").
 * UPDATED: Uses a dual-schema approach so it doesn't break older dashboards 
 * while fully supporting the updated User dashboard logic.
 */
export const notifyRole = async ({
  role,
  message,
  type = "",
  itemId = ""
}) => {
  try {
    const roleLower = role.toLowerCase();
    
    await addDoc(collection(db, "notifications"), {
      // --- NEW SCHEMA (For the User Dashboard we just fixed) ---
      role: roleLower,
      isReadBy: [],             

      // --- OLD SCHEMA (Restores the Moderator and Admin Dashboards) ---
      targetRole: roleLower, 
      read: false,              

      // --- CORE DATA ---
      message,
      type,
      itemId,
      createdAt: serverTimestamp() 
    });
  } catch (err) {
    console.error(`Failed to broadcast notification to role "${role}":`, err);
    throw err; 
  }
};