// Firebase Core
import { initializeApp } from "firebase/app";

// Firebase Services
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAdF9if7EWm696dyXplEG4fJM_hbfILybo",
  authDomain: "heritage-system.firebaseapp.com",
  projectId: "heritage-system",
  storageBucket: "heritage-system.firebasestorage.app",
  messagingSenderId: "664821109179",
  appId: "1:664821109179:web:4a2f20a04c4298ffe9349e"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const storage = getStorage(app);

// Export Services
export { auth, db, rtdb, storage };