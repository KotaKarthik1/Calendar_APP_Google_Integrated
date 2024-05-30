import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleOAuthProvider} from "@react-oauth/google";
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId="636820097566-743c59vsb4haepl10euaak21h53skeg5.apps.googleusercontent.com">
        <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
