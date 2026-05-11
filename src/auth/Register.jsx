import React, { useState } from "react";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../firebase/firebase";

const Register = ({ goBackToLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (isProcessing) return;
    
    setIsProcessing(true);
    setError("");

    try {
      // 1. LOCK App.jsx
      localStorage.setItem("isRegistering", "true");

      // 2. Create Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 3. Create the User Document in Firestore
      try {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          role: "user",
          createdAt: serverTimestamp(),
        });
      } catch (dbError) {
        console.error("Firestore blocked user doc creation:", dbError);
      }

      // 4. 🔔 SEND NOTIFICATION TO ADMIN
      try {
        await addDoc(collection(db, "notifications"), {
          userId: "N7m70ofOQiS4krrscBnKn6DHOzb2", // 👈 PASTE YOUR ADMIN UID HERE
          message: `New user registration: ${user.email}`,
          read: false,
          type: "registration",
          createdAt: serverTimestamp(),
        });
      } catch (notifError) {
        console.error("Failed to send notification to admin:", notifError);
      }

      // 5. Sign out IMMEDIATELY (Safety)
      await signOut(auth);

      // 6. Show success popup
      setShowSuccessPopup(true);

    } catch (err) {
      console.error("Registration Error:", err);
      if (err.code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else {
        setError("Registration failed. Please try again.");
      }
      localStorage.removeItem("isRegistering");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcknowledgeSuccess = () => {
    localStorage.removeItem("isRegistering");
    goBackToLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f5dc] to-white flex justify-center items-center p-5 font-sans relative">
      
      {showSuccessPopup && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full mx-4">
            <div className="text-green-600 text-6xl mb-4 font-bold">✓</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Registration Successful!</h2>
            <p className="text-gray-600 mb-8 text-center">
              Your account has been created. An administrator has been notified.
            </p>
            <button
              onClick={handleAcknowledgeSuccess}
              className="w-full bg-[#800000] hover:bg-[#600000] text-white py-3 rounded-lg font-bold transition shadow-md"
            >
              OK, Go to Login
            </button>
          </div>
        </div>
      )}

      <div className={`w-full max-w-lg ${showSuccessPopup ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#800000] mb-2">MSU Meranaw CHC</h1>
          <p className="text-gray-600">Digital Heritage Archive System</p>
        </div>

        <div className="bg-white p-10 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-bold text-center text-[#800000] mb-6">Register Account</h2>

          <form onSubmit={handleRegister} className="flex flex-col gap-5">
            <div>
              <label className="block mb-2 text-gray-600 font-medium">Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:border-[#800000] transition"
              />
            </div>

            <div>
              <label className="block mb-2 text-gray-600 font-medium">Password</label>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:border-[#800000] transition"
              />
            </div>

            {error && <p className="text-red-500 text-center font-medium">{error}</p>}

            <button
              type="submit"
              disabled={isProcessing}
              className={`w-full py-3 rounded-lg font-bold transition shadow-md mt-2 ${isProcessing ? "bg-gray-400" : "bg-[#800000] hover:bg-[#600000] text-white"}`}
            >
              {isProcessing ? "Processing..." : "Register"}
            </button>
          </form>

          <div className="text-center mt-6">
            <button onClick={goBackToLogin} className="text-[#800000] font-bold hover:underline">
              &larr; Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;