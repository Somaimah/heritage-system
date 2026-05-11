import React, { useState, useEffect } from "react";
import { auth } from "../firebase/firebase";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";

const Login = ({ goToRegister, goBack }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Prevent login page flash after successful authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoading(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // App.jsx will handle redirect to dashboard
    } catch (err) {
      console.error(err);
      setError("Invalid email or password.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#800000] text-white flex justify-center items-center text-3xl font-sans">
        Logging in...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#f5f5dc] to-white flex justify-center items-center p-5 font-sans">
      <div className="w-full max-w-lg">
        
        {/* Logo/Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[#800000] mb-1">
            MSU Meranaw CHC
          </h1>
          <p className="text-gray-600">
            Digital Heritage Archive System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white p-10 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-bold text-center text-[#800000] mb-6">
            Login
          </h2>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {/* Email */}
            <div>
              <label className="block mb-2 text-gray-600 font-medium">
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000] transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block mb-2 text-gray-600 font-medium">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000] transition"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-500 text-center font-medium">
                {error}
              </p>
            )}

            {/* Login Button */}
            <button
              type="submit"
              className="w-full bg-[#800000] hover:bg-[#600000] text-white py-3 rounded-lg font-bold transition shadow-md mt-2"
            >
              Login
            </button>
          </form>

          {/* Bottom Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row justify-between gap-3">
            <button
              onClick={goToRegister}
              className="flex-1 bg-[#D4A017] hover:bg-[#b58812] text-white py-2 px-4 rounded-lg font-medium transition shadow-sm"
            >
              Register
            </button>

            <button
              onClick={goBack}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#800000] py-2 px-4 rounded-lg font-medium transition shadow-sm"
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