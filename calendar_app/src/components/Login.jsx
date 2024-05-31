import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import GoogleButton from "react-google-button";
import axios from "redaxios";

function Login() {
  // State to manage the loading state of the button
  const [loading, setLoading] = useState(false);

  // Handle the login process
  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent the default form submission behavior

    try {
      setLoading(true); // Disable the button while loading

      // Fetch the Google OAuth URL from the backend
      const { data: { url } } = await axios.get('https://calendar-app-google-integrated.vercel.app/auth/url', {
        withCredentials: true // Send cookies along with the request
      });

      // Redirect the user to the fetched Google OAuth URL
      window.location.assign(url); 
    } catch (error) {
      console.error("Error initiating Google login:", error);
      setLoading(false); // Re-enable the button if an error occurs

      // Handle the error appropriately (e.g., show an error message to the user)
    }
  };

  return (
    <div>
      <h1>Login to Event Calendar</h1>
      <GoogleButton
        onClick={handleLogin}
        className="google-login-btn"
        type="dark"
        disabled={loading} // Disable the button while loading
      />
    </div>
  );
}

export default Login;
