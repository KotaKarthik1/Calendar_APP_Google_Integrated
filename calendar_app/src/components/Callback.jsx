import axios from "redaxios";
import { useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const Callback = ({ AuthContext }) => {
  const called = useRef(false);
  const { checkLoginState, loggedIn } = useContext(AuthContext);
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      if (loggedIn === false) {
        try {
          console.log("failure");
          if (called.current) return; // prevent rerender caused by StrictMode
          called.current = true;
          const res = await axios.get(
            `https://calendar-app-google-integrated.vercel.app/auth/token?code=${window.location.search}`,
            { withCredentials: true }
          );
          console.log("response: ", res);
          checkLoginState();

          navigate("/");
        } catch (err) {
          console.error(err);
          navigate("/");
        }
      } else if (loggedIn === true) {
        navigate("/");
        console.log("success");
      }
    })();
  }, [checkLoginState, loggedIn, navigate]);
  return <></>;
};

export default Callback;
