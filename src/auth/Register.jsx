import React, { useState } from "react";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { auth } from "../firebase/firebase";
import { db } from "../firebase/firebase";

const Register = ({ goBackToLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // 1️⃣ Create Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // 2️⃣ Create Firestore document
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "user",
        createdAt: serverTimestamp(),
      });

      // 3️⃣ Sign out immediately (no session)
      await signOut(auth);

      // 4️⃣ Show popup
      alert("Registration successful. Please login.");

      // 5️⃣ Smooth redirect AFTER popup is dismissed
      setTimeout(() => {
        goBackToLogin();
      }, 100);

    } catch (err) {
      console.error("Registration Error:", err);
      setError("Registration failed. Try another email.");
    }
  };

  return (
    <div>
      <h2>Register</h2>

      <form onSubmit={handleRegister}>
        <input
          type="email"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <br /><br />

        <input
          type="password"
          placeholder="Enter Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <br /><br />

        <button type="submit">Register</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <br />

      <button onClick={goBackToLogin}>
        Back to Login
      </button>
    </div>
  );
};

export default Register;