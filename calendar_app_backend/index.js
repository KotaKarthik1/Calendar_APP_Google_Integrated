// Import required packages
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const { google } = require("googleapis");
const User = require("./models/UserDetailsModel");
const mongoose = require("mongoose");

// Initialize query string utility
let queryString;
initializeQueryString();
async function initializeQueryString() {
  const { default: qs } = await import("query-string");
  queryString = qs;
}

// Connect to MongoDB
mongoose
  .connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));
  

// OAuth2 Configuration
const config = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  authUrl: "https://accounts.google.com/o/oauth2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  redirectUrl: process.env.REDIRECT_URL,
  clientUrl: process.env.CLIENT_URL,
  tokenSecret: process.env.TOKEN_SECRET,
  tokenExpiration: 36000, // in seconds
  postUrl: "https://jsonplaceholder.typicode.com/posts",
};

const oauth2Client = new google.auth.OAuth2(
  config.clientId,
  config.clientSecret,
  config.redirectUrl
);
console.log("Starting server with config:", config);

// Create Express application
const app = express();
console.log("Client URL is", process.env.CLIENT_URL);
console.log("Redirect URL is", process.env.REDIRECT_URL);

// Resolve CORS with credentials support
app.use(
  cors({
    origin: [process.env.CLIENT_URL],
    methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(cookieParser());
console.log("CORS configured with origin:", config.clientUrl);

// Helper function to generate token parameters for the token endpoint
const getTokenParams = (code) => {
  return queryString.stringify({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUrl,
    grant_type: "authorization_code",
  });
};

// Middleware to verify authentication
const auth = (req, res, next) => {
  try {
    console.log("Checking token in cookies...");
    const token = req.cookies.token;
    if (!token) {
      console.warn("No token found in cookies.");
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("Token found, verifying...");
    const decoded = jwt.verify(token, config.tokenSecret);
    req.user = decoded.user; // Save user in the request object
    console.log("Token verified. User:", req.user);
    next(); // Continue with the request
  } catch (err) {
    console.error("Authentication error:", err);
    res.status(401).json({ message: "Unauthorized" });
  }
};

// Helper function to generate Google OAuth URL
const getAuthUrl = (queryString) => {
  console.log("Generating Google OAuth URL...");
  return `${config.authUrl}?${queryString.stringify({
    client_id: config.clientId,
    redirect_uri: config.redirectUrl,
    response_type: "code",
    scope: "openid profile email https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    state: "standard_oauth",
    prompt: "consent",
  })}`;
};

// Get the authorization URL
app.get("/auth/url", (_, res) => {
  const authUrl = getAuthUrl(queryString);
  console.log("Authorization URL:", authUrl);
  res.json({ url: authUrl });
});

// Exchange authorization code for access token and create session cookie
app.get("/auth/token", async (req, res) => {
  const { code } = req.query;
  console.log("Received request with authorization code:", code);

  if (!code) {
    console.warn("No authorization code provided.");
    return res.status(400).json({ message: "Authorization code must be provided" });
  }

  try {
    const tokenParam = getTokenParams(code);
    console.log("Token parameters:", tokenParam);

    const response = await axios.post(config.tokenUrl, tokenParam);
    const id_token = response.data.id_token;
    const refresh_token = response.data.refresh_token;
    console.log(refresh_token);
    oauth2Client.setCredentials({ refresh_token });
    console.log("Refresh token is set as credentials to oauthClient");

    if (!id_token) {
      console.warn("No id_token returned from OAuth server.");
      return res.status(400).json({ message: "Authorization error" });
    }

    const { email, name, picture } = jwt.decode(id_token);
    console.log("User info:", { email, name, picture });

    const user = { name, email, picture };
    let dbUser = await User.findOne({ email });
    if (!dbUser) {
      dbUser = new User({
        email,
        name,
        refreshToken: refresh_token,
      });
    } else {
      dbUser.refreshToken = refresh_token;
    }
    await dbUser.save();

    const token = jwt.sign({ user }, config.tokenSecret, {
      expiresIn: config.tokenExpiration,
    });
    console.log("Setting cookie with JWT...");
    res.cookie("token", token, {
      maxAge: config.tokenExpiration * 1000,
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });
    res.json({ user });
  } catch (err) {
    console.error("Error in token exchange:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to check if user is logged in
app.get("/auth/logged_in", (req, res) => {
  try {
    console.log("Checking login status...");
    const token = req.cookies.token;

    if (!token) {
      console.warn("No token found in cookies.");
      return res.json({ loggedIn: false });
    }

    const decoded = jwt.verify(token, config.tokenSecret);
    const newToken = jwt.sign({ user: decoded.user }, config.tokenSecret, {
      expiresIn: config.tokenExpiration,
    });

    console.log("Resetting cookie with new token...");
    res.cookie("token", newToken, {
      maxAge: config.tokenExpiration * 1000,
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });

    res.json({ loggedIn: true, user: decoded.user });
  } catch (err) {
    console.error("Error in checking login status:", err);
    res.json({ loggedIn: false });
  }
});

// Endpoint to log out
// app.post("/auth/logout/:email", auth, async (req, res) => {
//   console.log("Logging out and clearing cookie...");
  
//   try {
//     const email = req.params.email;
//     const dbUser = await User.findOne({ email });
//     dbUser.refreshToken = null;
//     await dbUser.save();

//     res.clearCookie("token").json({ message: "Logged out" });
//   } catch (err) {
//     console.error("Error in logout:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });
app.post("/auth/logout/:email", auth, async (req, res) => {
  console.log("Logging out and clearing cookie...");
  try {
    const email = req.params.email;
    const dbUser = await User.findOne({ email });
    dbUser.refreshToken = null;
    await dbUser.save();

    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "None",
      secure: true,
    }).json({ message: "Logged out" });
  } catch (err) {
    console.error("Error in logout:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Sample protected endpoint to fetch user posts
app.get("/user/posts", auth, async (req, res) => {
  console.log("Fetching user posts...");
  try {
    const { data } = await axios.get(config.postUrl);
    res.json({ posts: data.slice(0, 5) });
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/schedule-event/:email", auth, async (req, res) => {
  try {
    const email = req.params.email;
    const requestBody = req.body;
    const dbUser = await User.findOne({ email });
    oauth2Client.setCredentials({ refresh_token: dbUser.refreshToken });
    const calendar = google.calendar({ version: "v3" });

    const event = await calendar.events.insert({
      calendarId: "primary",
      auth: oauth2Client,
      requestBody,
    });

    const newEvent = {
      id: event.data.id,
      summary: event.data.summary,
      description: event.data.description,
      start: event.data.start.dateTime,
      end: event.data.end.dateTime,
    };

    res.json(newEvent);
  } catch (err) {
    console.error("Error scheduling event:", err);
    res.status(500).json({ message: "Server error" });
  }
});
//get calendar events from specified date
app.get("/calendar-events/:email", auth, async (req, res) => {
  try {
    const calendar = google.calendar({ version: "v3" });
    const email = req.params.email;
    let dbuser = await User.findOne({ email });
    const DBRefreshToekn = dbuser.refreshToken;
    oauth2Client.setCredentials({ refresh_token: DBRefreshToekn });
    const response = await calendar.events.list({
      auth: oauth2Client,
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });
    const events = response.data.items;
    const filteredEvents = events.map((event) => ({
      id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start.dateTime, // Or event.start.date if it's an all-day event
      end: event.end.dateTime, // Or event.end.date if it's an all-day event
    }));
    console.log(filteredEvents);
    res.json(filteredEvents);
  } catch (err) {
    console.error("Error fetching events:", err);
    if (err.code === 401) {
      return res.status(401).json({ message: "Token expired" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/delete-event/:eventId/:email", auth, async (req, res) => {
  try {
    const { eventId, email } = req.params;
    console.log("Deleting event with ID:", eventId);

    const dbUser = await User.findOne({ email });
    const DBRefreshToekn = dbUser.refreshToken;

    oauth2Client.setCredentials({ refresh_token: DBRefreshToekn });
    const calendar = google.calendar({ version: "v3" });

    const event = await calendar.events.delete({
      calendarId: "primary",
      auth: oauth2Client,
      eventId,
    });
    // Remove from DB
    const eventIndex = dbUser.events.findIndex((e) => e.id === eventId);
    if (eventIndex > -1) {
      dbUser.events.splice(eventIndex, 1);
      await dbUser.save();
    }
    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("Error deleting event:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Start the server
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
