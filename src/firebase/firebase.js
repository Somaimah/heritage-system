import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAdF9if7EWm696dyXplEG4fJM_hbfILybo",
  authDomain: "heritage-system.firebaseapp.com",
  projectId: "heritage-system",
  storageBucket: "heritage-system.appspot.com", // ✅ FIXED
  messagingSenderId: "664821109179",
  appId: "1:664821109179:web:4a2f20a04c4298ffe9349e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;