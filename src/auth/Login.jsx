import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebase";

const Login = ({ goToRegister, goBack }) => {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    try {

      await signInWithEmailAndPassword(auth, email, password);

      // IMPORTANT: redirect to dashboard
      localStorage.setItem("page", "dashboard");
      window.location.reload();

    } catch (error) {
      console.error(error);
      alert("Login failed: " + error.message);
    }
  };

  return (
    <div>

      <h2>Login</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br /><br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br /><br />

      <button onClick={handleLogin}>
        Login
      </button>

      <br /><br />

      <button onClick={goToRegister}>
        Register
      </button>

      <button onClick={goBack}>
        Back
      </button>

    </div>
  );
};

export default Login;