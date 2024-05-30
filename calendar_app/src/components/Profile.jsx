import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/Profile.css'; // Add CSS for styling if needed

const Profile = ({ AuthContext }) => {
  const { user, loggedIn, checkLoginState } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    checkLoginState();
  }, [checkLoginState]);

  if (loggedIn === false) {
    navigate('/'); // Redirect to login if not logged in
    return null;
  }

  if (!user) {
    return <div>Loading user profile...</div>; // Show a loading state while fetching user data
  }
 
  const Calendarnavigator=(()=>
    (
        navigate('/')
    ))
  return (
    <div className="profile-container">
      <h2>Welcome, {user.name}!</h2>
      <p>Email: {user.email}</p>
      {/* Add more profile information as needed (e.g., picture) */}
      <button className='btn' onClick={Calendarnavigator}>back to calendar</button>
    </div>
  );
};

export default Profile;
