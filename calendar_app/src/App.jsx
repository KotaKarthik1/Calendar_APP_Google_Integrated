import { RouterProvider, createBrowserRouter, useNavigate } from 'react-router-dom'
import axios from 'redaxios'
import { useEffect, useRef, useState, createContext, useContext, useCallback } from 'react'
import Login from './components/Login'
import Layout from './components/Layout'
import Callback from './components/Callback'
import Profile from './components/Profile'
import EventForm from './components/EventForm'
import EventFormNoParams from './components/EventFormNoParams'

// Ensures cookie is sent
axios.defaults.withCredentials = true

const AuthContext = createContext()
const AuthContextProvider = ({ children }) => {
  const [loggedIn, setLoggedIn] = useState(null)
  const [user, setUser] = useState(null)

  const checkLoginState = useCallback(async () => {
    try {
      const { data: { loggedIn: logged_in, user } } = await axios.get(`https://calendar-app-google-integrated.vercel.app/auth/logged_in`);
      setLoggedIn(logged_in);
      if (user) setUser(user);
    } catch (err) {
      setLoggedIn(false);
      setUser(null);
      console.error(err);
    }
  }, []);

  const resetLoginState = () => {
    setLoggedIn(false);
    setUser(null);
  };

  useEffect(() => {
    checkLoginState();
  }, [checkLoginState]);

  return <AuthContext.Provider value={{ loggedIn, checkLoginState, resetLoginState, user }}>{children}</AuthContext.Provider>
}

const Home = () => {  
  const { loggedIn } = useContext(AuthContext)  
  console.log(loggedIn);
  if (loggedIn === true) return <Layout AuthContext={AuthContext} />
  if (loggedIn === false) return <Login />
  return <></>
}

const router = createBrowserRouter([
  {
    path: '/*',
    element: <Home />,
  },
  {
    path: '/auth/callback', // google will redirect here
    element: <Callback AuthContext={AuthContext} />,
  },
  {
    path:'/profile',
    element: <Profile AuthContext={AuthContext}/>
  },
  {
    path:'/eventform/*',
    element: <EventForm AuthContext={AuthContext}/>
  },
  {
      path:'/eventform',
      element: <EventFormNoParams AuthContext={AuthContext}/>
  }
])


function App() {

  return (
    <>
      <AuthContextProvider>
        <RouterProvider router={router} />
      </AuthContextProvider>
    </>
  )
}

export default App