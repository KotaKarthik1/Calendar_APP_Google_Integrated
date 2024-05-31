import React, { useContext, useEffect, useRef } from 'react';
import axios from 'redaxios';
import { useNavigate } from 'react-router-dom';

const Callback = ({ AuthContext }) => {
  // Use ref to track if the effect has been called before
  const called = useRef(false); 

  // Get functions from AuthContext
  const { checkLoginState, loggedIn } = useContext(AuthContext); 

  // Get the navigate function for programmatic navigation
  const navigate = useNavigate(); 

  useEffect(() => {
    (async () => {
      // Only proceed if the user is NOT already logged in
      if (loggedIn === false) { 

        try {
          console.log("failure");

          // Prevent multiple calls in strict mode (during development)
          if (called.current) return;
          called.current = true;

          // Fetch the token from the backend using the code from query parameters
          const res = await axios.get(
            `https://calendar-app-google-integrated.vercel.app/auth/token?code=${window.location.search}`,
            { withCredentials: true } 
          );
          console.log("response: ", res);
          
          // Check and update the login state
          checkLoginState();

          // Navigate to the home page
          navigate("/"); 
        } catch (err) {
          console.error(err);
          // Handle errors and navigate to the home page
          navigate("/");
        }
      } else if (loggedIn === true) { 
        // User already logged in, redirect to home page
        navigate("/");
        console.log("success");
      }
    })();
  }, [checkLoginState, loggedIn, navigate]); // Dependencies for the effect

  // This component doesn't render anything, it's for handling the callback logic
  return <></>; 
};

export default Callback;
