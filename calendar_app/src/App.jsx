import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { RouterProvider, createBrowserRouter, useNavigate } from 'react-router-dom';
import axios from 'redaxios';
import Login from './components/Login';
import Layout from './components/Layout';
import Callback from './components/Callback';
import Profile from './components/Profile';
import EventForm from './components/EventForm';

// Ensure cookies are sent with requests (important for authentication)
axios.defaults.withCredentials = true;

// Create an authentication context to share login state and user data
const AuthContext = createContext();

// AuthContext Provider component
const AuthContextProvider = ({ children }) => {
  // States to manage login status and user information
  const [loggedIn, setLoggedIn] = useState(null); // Initially null to indicate loading
  const [user, setUser] = useState(null);

  // Function to check and update the login state
  const checkLoginState = useCallback(async () => {
    try {
      // Send a request to the backend to check if the user is logged in
      const { data: { loggedIn: logged_in, user } } = await axios.get('https://calendar-app-google-integrated.vercel.app/auth/logged_in');

      // Update the state with the received data
      setLoggedIn(logged_in);
      if (user) setUser(user);
    } catch (err) {
      // If an error occurs, set logged in to false and clear user data
      setLoggedIn(false); 
      setUser(null);
      console.error(err);
    }
  }, []);

  // Function to reset the login state on logout
  const resetLoginState = () => {
    setLoggedIn(false);
    setUser(null);
  };

  // Check the login state initially when the component mounts
  useEffect(() => {
    checkLoginState();
  }, [checkLoginState]); // Call checkLoginState only once

  // Provide the authentication context to child components
  return (
    <AuthContext.Provider value={{ loggedIn, checkLoginState, resetLoginState, user }}>
      {children}
    </AuthContext.Provider>
  );
};

// Home component to conditionally render either Login or Layout based on login state
const Home = () => {
  const { loggedIn } = useContext(AuthContext);
  console.log(loggedIn);
  if (loggedIn === true) return <Layout AuthContext={AuthContext} />; // Show layout if logged in
  if (loggedIn === false) return <Login />; // Show login form if not logged in
  return <></>; // Render nothing while checking login status
};

// Define the routes for the app
const router = createBrowserRouter([
  {
    path: '/*', // Catch-all route
    element: <Home />,
  },
  {
    path: '/auth/callback', // Route for handling the Google OAuth callback
    element: <Callback AuthContext={AuthContext} />,
  },
  {
    path: '/profile', // Route for the user profile page
    element: <Profile AuthContext={AuthContext} />,
  },
  {
    path: '/eventform', // Route for the event creation form
    element: <EventForm AuthContext={AuthContext} />,
  },
]);

// Main App component
function App() {
  return (
    <AuthContextProvider>
      <RouterProvider router={router} /> {/* Render the router to manage navigation */}
    </AuthContextProvider>
  );
}

export default App;
