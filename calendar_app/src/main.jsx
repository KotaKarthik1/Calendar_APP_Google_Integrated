// index.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Google OAuth Provider: Wraps the entire app to provide the necessary context */}
    <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}> 
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
