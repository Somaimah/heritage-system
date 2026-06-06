import React, { useState } from "react";
import { 
  createUserWithEmailAndPassword, 
  signOut, 
  sendEmailVerification, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase/firebase";
// ✅ Added Eye and EyeOff icons
import { Eye, EyeOff } from "lucide-react";

const Register = ({ goBackToLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  
  // ✅ Added state for toggling password visibility
  const [showPassword, setShowPassword] = useState(false);

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
      setError("Registration blocked! Please enter a valid email address.");
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

      // ✅ 1. CREATE FIRESTORE DOC FIRST
      // This ensures the "Guest List" record is created immediately.
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "user",
        createdAt: serverTimestamp(),
        verifiedNotificationSent: false 
      });

      // ✅ 2. SEND VERIFICATION SECOND
      await sendEmailVerification(user);

      setEmail("");
      setPassword("");
      await signOut(auth); // Sign them out so they have to verify before logging in
      setShowSuccessPopup(true);

    } catch (err) {
      console.error("Registration Error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Try logging in.");
      } else {
        setError("Registration failed. Please try again.");
      }
      localStorage.removeItem("isRegistering");
    } finally {
      setIsProcessing(false);
    }
  };

  // ================= 2. GOOGLE SIGN-UP =================
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
          verifiedNotificationSent: false 
        });
      }
      // Note: Google users don't need to sign out; they are already verified by Google.
    } catch (err) {
      console.error("Google Authentication Error:", err);
      setError("Google connection failed.");
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
      
      {showSuccessPopup && (
        <div className="absolute inset-0 bg-[#4A0C16]/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-[#E09F26]/30 text-center max-w-md w-full mx-4">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 font-bold border border-green-100">✓</div>
            <h2 className="text-2xl font-bold font-serif text-[#4A0C16] mb-3">Registration Successful</h2>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              Account created! Please check your email and click the verification link to activate your account.
            </p>
            <button onClick={handleAcknowledgeSuccess} className="w-full bg-[#4A0C16] hover:bg-[#31080E] text-white py-3 rounded-xl font-bold transition duration-300 border border-[#E09F26]/20">
              Proceed to Login
            </button>
          </div>
        </div>
      )}

      <div className={`w-full max-w-lg transition-all duration-300 ${showSuccessPopup ? "opacity-30 pointer-events-none scale-95" : ""}`}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-serif text-[#4A0C16] tracking-wide mb-1">MSU Meranaw CHC</h1>
          <p className="text-xs tracking-widest text-[#E09F26] uppercase font-semibold">Digital Heritage Archive System</p>
        </div>

        <div className="bg-white p-8 lg:p-10 rounded-3xl shadow-[0_10px_35px_-5px_rgba(74,12,22,0.08)] border border-[#E09F26]/20">
          <h2 className="text-2xl font-bold text-center font-serif text-[#4A0C16] mb-6">Register Account</h2>

          <form onSubmit={handleRegister} className="flex flex-col gap-5">
            <div>
              <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</label>
              <input
                name="emailInput"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E09F26] focus:ring-2 focus:ring-[#E09F26]/10 text-gray-800 transition bg-gray-50/50 text-sm"
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Password</label>
              {/* ✅ Added relative wrapper and toggle button */}
              <div className="relative">
                <input
                  name="passwordInput"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full p-3.5 pr-12 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E09F26] focus:ring-2 focus:ring-[#E09F26]/10 text-gray-800 transition bg-gray-50/50 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#E09F26] transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
            <button onClick={goBackToLogin} className="text-[#4A0C16] font-bold text-sm hover:text-[#E09F26] transition duration-200">
              &larr; Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;