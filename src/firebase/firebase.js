import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// Import initializeFirestore and memoryLocalCache instead of getFirestore
import { initializeFirestore, memoryLocalCache } from "firebase/firestore"; 
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "heritage-system.firebaseapp.com",
  projectId: "heritage-system",
  storageBucket: "heritage-system.appspot.com",
  messagingSenderId: "664821109179",
  appId: "1:664821109179:web:4a2f20a04c4298ffe9349e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
});

export const storage = getStorage(app);

export default app;