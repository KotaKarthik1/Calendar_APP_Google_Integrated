import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import GoogleButton from 'react-google-button';
import axios from 'redaxios'
function Login() {
  const [loading, setLoading] = useState(false);
  const handleLogin = async (e) => {
    e.preventDefault();
    // Navigate to Google OAuth URL
    const { data: { url } } = await axios.get('http://localhost:5000/auth/url');
    window.location.assign(url);
  };
  return (
    <div>
      <h1>Login to Event Calender</h1>
      <GoogleButton
                onClick={handleLogin}
                className='google-login-btn'
                type='dark'
                disabled={loading} // Prevent interaction if loading
              />
    </div>
  )
}

export default Login
