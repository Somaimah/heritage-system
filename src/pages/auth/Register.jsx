import React, { useState } from "react";
import { 
  createUserWithEmailAndPassword, 
  signOut, 
  sendEmailVerification, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

const Register = ({ goBackToLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // ================= 1. STANDARD EMAIL REGISTER WITH VERIFICATION LINK =================
  const handleRegister = async (e) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsProcessing(true);
    setError("");

    const formElements = e.target.elements;
    const rawEmailValue = formElements.emailInput.value;
    const rawPasswordValue = formElements.passwordInput.value;
    const sanitizedEmail = rawEmailValue.trim().toLowerCase();

    const strictEmailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;

    if (!strictEmailRegex.test(sanitizedEmail)) {
      setError("Registration blocked! Please enter a valid email structural syntax (e.g., username@domain.com).");
      setIsProcessing(false);
      return; 
    }

    if (rawPasswordValue.length < 6) {
      setError("Password must be at least 6 characters.");
      setIsProcessing(false);
      return;
    }

    try {
      localStorage.setItem("isRegistering", "true");
      
      const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, rawPasswordValue);
      const user = userCredential.user;

      await sendEmailVerification(user);

      try {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          role: "user",
          createdAt: serverTimestamp(),
          // We set this to false so Login.jsx knows to send the alert when they finally verify & login!
          verifiedNotificationSent: false 
        });
      } catch (dbError) {
        console.error("Firestore blocked user doc creation:", dbError);
      }

      setEmail("");
      setPassword("");
      await signOut(auth);
      setShowSuccessPopup(true);

    } catch (err) {
      console.error("Registration Error:", err);
      if (err.code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else if (err.code === "auth/invalid-email") {
        setError("Firebase rejected this email structure.");
      } else {
        setError("Registration failed. Please try again.");
      }
      localStorage.removeItem("isRegistering");
    } finally {
      setIsProcessing(false);
    }
  };

  // ================= 2. GOOGLE SIGN-IN & REGISTRATION =================
  const handleGoogleRegister = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setError("");
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnapshot = await getDoc(userDocRef);

      if (!userDocSnapshot.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          role: "user",
          createdAt: serverTimestamp(),
          // Login.jsx handles Google notifications too!
          verifiedNotificationSent: false 
        });
      }
    } catch (err) {
      console.error("Google Authentication Error:", err);
      setError("Google connection failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcknowledgeSuccess = () => {
    localStorage.removeItem("isRegistering");
    goBackToLogin();
  };

  return (
    <div className="min-h-screen bg-[#FEF9C3] flex justify-center items-center p-6 font-sans relative antialiased selection:bg-[#4A0C16]/20">
      
      {/* SUCCESS MODAL POPUP */}
      {showSuccessPopup && (
        <div className="absolute inset-0 bg-[#4A0C16]/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-[#E09F26]/30 text-center max-w-md w-full mx-4">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 font-bold border border-green-100">
              ✓
            </div>
            <h2 className="text-2xl font-bold font-serif text-[#4A0C16] mb-3">Registration Successful</h2>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              Account created! We've sent an activation link to your email inbox. Please verify your address to log in.
            </p>
            <button
              onClick={handleAcknowledgeSuccess}
              className="w-full bg-[#4A0C16] hover:bg-[#31080E] text-white py-3 rounded-xl font-bold transition duration-300 shadow-md border border-[#E09F26]/20"
            >
              Proceed to Login
            </button>
          </div>
        </div>
      )}

      {/* REGISTRATION CORE WRAPPER */}
      <div className={`w-full max-w-lg transition-all duration-300 ${showSuccessPopup ? "opacity-30 pointer-events-none scale-95" : ""}`}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-serif text-[#4A0C16] tracking-wide mb-1">MSU Meranaw CHC</h1>
          <p className="text-xs tracking-widest text-[#E09F26] uppercase font-semibold">Digital Heritage Archive System</p>
        </div>

        {/* CONTAINER CARD MATCHING DASHBOARD GEOMETRY */}
        <div className="bg-white p-8 lg:p-10 rounded-3xl shadow-[0_10px_35px_-5px_rgba(74,12,22,0.08)] border border-[#E09F26]/20">
          <h2 className="text-2xl font-bold text-center font-serif text-[#4A0C16] mb-6">Register Account</h2>

          <form onSubmit={handleRegister} className="flex flex-col gap-5">
            <div>
              <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</label>
              <input
                name="emailInput"
                type="text"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E09F26] focus:ring-2 focus:ring-[#E09F26]/10 text-gray-800 transition bg-gray-50/50 text-sm"
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Password</label>
              <input
                name="passwordInput"
                type="password"
                placeholder="Create a password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E09F26] focus:ring-2 focus:ring-[#E09F26]/10 text-gray-800 transition bg-gray-50/50 text-sm"
              />
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3.5 rounded-xl my-1">
                <p className="text-red-700 text-center font-semibold text-xs leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className={`w-full py-3.5 rounded-xl font-bold transition duration-300 shadow-md mt-2 text-sm tracking-wide ${
                isProcessing 
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                  : "bg-[#4A0C16] hover:bg-[#31080E] text-white border border-[#E09F26]/20 shadow-[0_4px_15px_rgba(74,12,22,0.15)]"
              }`}
            >
              {isProcessing ? "Processing..." : "Register"}
            </button>
          </form>

          {/* SPLIT HORIZONTAL DIVIDER */}
          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="px-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">OR</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleRegister}
            disabled={isProcessing}
            className="w-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50/80 py-3 rounded-xl font-semibold flex items-center justify-center gap-3 transition duration-300 shadow-sm text-sm"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4" />
            <span>Sign Up with Gmail</span>
          </button>

          <div className="text-center mt-6 pt-2 border-t border-gray-50">
            <button 
              onClick={goBackToLogin} 
              className="text-[#4A0C16] font-bold text-sm hover:text-[#E09F26] transition duration-200"
            >
              &larr; Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;