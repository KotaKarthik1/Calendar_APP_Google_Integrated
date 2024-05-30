// Import required packages

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const { google } = require("googleapis");
const { DateTime } = require("luxon");
const User = require("./models/UserDetailsModel");
const mongoose = require("mongoose");
let queryString;
initializeQueryString();
async function initializeQueryString() {
  const { default: qs } = await import("query-string");
  queryString = qs;
}
initializeQueryString();

//mongoose connect

mongoose
  .connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

// done

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

// Resolve CORS with credentials support
app.use(
  cors({
    credentials: true,
  })
);

app.use(bodyParser.json());
console.log(config.clientUrl);
console.log("CORS configured with origin:", config.clientUrl);

// Middleware to parse cookies
app.use(cookieParser());
console.log("Cookie parser initialized.");

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
app.get("/auth/url", (_, res) => {
  const authUrl = getAuthUrl();
  console.log("Authorization URL:", authUrl);
  res.json({ url: authUrl });
});

// Exchange authorization code for access token and create session cookie
app.get("/auth/token", async (req, res) => {
  const { code } = req.query;
  console.log("Received request with authorization code:", code);

  if (!code) {
    console.warn("No authorization code provided.");
    return res
      .status(400)
      .json({ message: "Authorization code must be provided" });
  }

  try {
    const tokenParam = getTokenParams(code);
    console.log("Token parameters:", tokenParam);

    const response = await axios.post(config.tokenUrl, tokenParam);
    // console.log(response," these are the tokenss from the response")
    const id_token = response.data.id_token;
    const refreshtoken = response.data.refresh_token;
    console.log(refreshtoken);
    oauth2Client.setCredentials({ refresh_token: refreshtoken });
    console.log(" refresh token is set as credentials succes to oauthclient ");

    if (!id_token) {
      console.warn("No id_token returned from OAuth server.");
      return res.status(400).json({ message: "Authorization error" });
    }

    const { email, name, picture } = jwt.decode(id_token);
    console.log("User info:", { email, name, picture });

    const user = { name, email, picture };
    let dbuser = await User.findOne({ email });
    if (!dbuser) {
      dbuser = new User({
        email: email,
        name: name,
        refreshToken: refreshtoken,
      }); // Create a new user if they don't exist
    } else {
      dbuser.refreshToken = refreshtoken; // Update refreshToken if the user exists
    }
    await dbuser.save();
    const token = jwt.sign({ user }, config.tokenSecret, {
      expiresIn: config.tokenExpiration,
    });
    console.log(token);
    console.log("Setting cookie with JWT...");
    res.cookie("token", token, {
      maxAge: config.tokenExpiration * 1000,
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });
    console.log("success");
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
    //console.log('Cookie token:', token);

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
app.post("/auth/logout", (_, res) => {
  console.log("Logging out and clearing cookie...");
  res.clearCookie("token").json({ message: "Logged out" });
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
    const requestBody = req.body; // Get event data from the request body
    console.log(requestBody, "   is the requestbody");
    const dbUser = await User.findOne({ email });
    const dbRefreshToken = dbUser.refreshToken;

    oauth2Client.setCredentials({ refresh_token: dbRefreshToken });
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
      start: event.data.start.dateTime || event.data.start.date,
      end: event.data.end.dateTime || event.data.end.date,
    };

    dbUser.events.push(newEvent);

    await dbUser.save();

    res.json({ message: "Event created successfully", event });
  } catch (err) {
    console.error("Error scheduling event:", err);

    if (
      err.code === 401 &&
      err.response.data.error_description.includes("Token has expired")
    ) {
      return res.status(401).json({ message: "Token expired" });
    }

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
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
