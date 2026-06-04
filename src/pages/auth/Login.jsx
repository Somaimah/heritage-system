import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase/firebase";
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

// Services & Context
import { notifyRole } from "../services/notificationService"; 
import { useToast } from "../contexts/ToastContext";

const Login = ({ goToRegister, goBack }) => {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.emailVerified) {
        setLoading(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // ================= 1. STANDARD EMAIL LOGIN =================
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        await signOut(auth); 
        const verifyMsg = "Your account email hasn't been verified yet. Check your inbox!";
        setError(verifyMsg);
        showToast(verifyMsg, "warning");
        setLoading(false);
        return;
      }

      // SYNC WITH ADMIN REGISTRY
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        // Notify admin only on the very first verified login
        if (!userData.verifiedNotificationSent) {
          await notifyRole({
            role: "admin",
            message: `New verified user detected: ${user.email}`,
            type: "system",
            isReadBy: [] 
          });
          
          await updateDoc(userDocRef, { verifiedNotificationSent: true });
        }
      }
      
      showToast("Authentication successful. Welcome back.", "success");

    } catch (err) {
      console.error("Login Error:", err);
      const errorMsg = "Invalid email or password. Please verify credentials.";
      setError(errorMsg);
      showToast(errorMsg, "error");
      setLoading(false);
    }
  };

  // ================= 2. GOOGLE ONE-CLICK LOG IN =================
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnapshot = await getDoc(userDocRef);

      // Initialize Record for New Google User
      if (!userDocSnapshot.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          role: "user",
          createdAt: serverTimestamp(),
          verifiedNotificationSent: true 
        });

        await notifyRole({
          role: "admin",
          message: `New Google registration: ${user.email}`,
          type: "system",
          isReadBy: [] 
        });
      }

      showToast(`Signed in as ${user.email}`, "success");

    } catch (err) {
      console.error("Google Login Error:", err);
      showToast("Google authentication encountered an error.", "error");
      setLoading(false);
    }
  };

  // ================= 3. FORGOT PASSWORD HANDLER =================
  const handleForgotPassword = async () => {
    if (!email) {
      const emailRequired = "Please enter your email address to receive a reset link.";
      setError(emailRequired);
      showToast(emailRequired, "warning");
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      showToast("Password reset link dispatched! Please check your inbox and spam folder.", "success");
      setError(""); 
    } catch (err) {
      console.error("Reset Email Error:", err);
      let msg = "Failed to send reset email. Please try again.";
      if (err.code === 'auth/user-not-found') {
        msg = "No account found with this email address.";
      }
      setError(msg);
      showToast(msg, "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FEF9C3] flex flex-col justify-center items-center gap-4 font-sans animate-fadeIn">
        <Loader2 className="w-12 h-12 text-[#4A0C16] animate-spin" />
        <span className="text-sm font-bold tracking-widest text-[#4A0C16] uppercase">
          Authenticating...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FEF9C3] flex justify-center items-center p-6 font-sans antialiased selection:bg-[#4A0C16]/20">
      <div className="w-full max-w-lg animate-fadeIn">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-serif text-[#4A0C16] tracking-wide mb-1">MSU Meranaw CHC</h1>
          <p className="text-xs tracking-widest text-[#E09F26] uppercase font-semibold">Digital Heritage Archive System</p>
        </div>

        <div className="bg-white p-8 lg:p-10 rounded-3xl shadow-[0_10px_35px_-5px_rgba(74,12,22,0.08)] border border-[#E09F26]/20">
          <h2 className="text-2xl font-bold text-center font-serif text-[#4A0C16] mb-6">
            Login to Account
          </h2>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E09F26] focus:ring-2 focus:ring-[#E09F26]/10 text-gray-800 transition bg-gray-50/50 text-sm"
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E09F26] focus:ring-2 focus:ring-[#E09F26]/10 text-gray-800 transition bg-gray-50/50 text-sm"
              />
              
              <div className="flex justify-end mt-2.5">
                <button 
                  type="button" 
                  onClick={handleForgotPassword}
                  className="text-xs text-[#E09F26] hover:text-[#b58812] hover:underline font-bold tracking-wide uppercase transition duration-200"
                >
                  Forgot Password?
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
              className="w-full bg-[#4A0C16] hover:bg-[#31080E] text-white py-3.5 rounded-xl font-bold transition duration-300 shadow-md mt-2 text-sm tracking-wide border border-[#E09F26]/20 shadow-[0_4px_15px_rgba(74,12,22,0.15)]"
            >
              Login
            </button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="px-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">OR</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50/80 py-3 rounded-xl font-semibold flex items-center justify-center gap-3 transition duration-300 shadow-sm text-sm"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4" />
            <span>Continue with Gmail</span>
          </button>

          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between gap-3">
            <button
              onClick={goToRegister}
              className="flex-1 bg-[#E09F26] hover:bg-[#b58812] text-[#4A0C16] py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition duration-300 shadow-sm border border-[#4A0C16]/10"
            >
              Register
            </button>

            <button
              onClick={goBack}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition duration-300 shadow-sm"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;