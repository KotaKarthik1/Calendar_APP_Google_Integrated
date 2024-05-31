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

// Create a Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  config.clientId,
  config.clientSecret,
  config.redirectUrl
);
// console.log("Starting server with config:", config);

// Create Express application
const app = express();

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
    // 1. Check if a token exists in the cookies
    console.log("Checking token in cookies...");
    const token = req.cookies.token;

    if (!token) {
      // If no token is found, the user is not authorized
      console.warn("No token found in cookies.");
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 2. Verify the token
    console.log("Token found, verifying...");
    const decoded = jwt.verify(token, config.tokenSecret);

    // 3. Attach user data to the request object
    req.user = decoded.user; // This data can be accessed in subsequent middleware or routes
    console.log("Token verified. User:", req.user);

    // 4. Allow the request to proceed
    next(); // Move on to the next middleware or route handler
  } catch (err) {
    // If an error occurs during verification (e.g., invalid token), return unauthorized
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

// Get the authorization URL for Google OAuth
app.get("/auth/url", (_, res) => {
  // 1. Generate the OAuth authorization URL
  const authUrl = getAuthUrl(queryString); // Call the helper function to construct the URL
  console.log("Authorization URL:", authUrl); // Log the URL for debugging

  // 2. Send the authorization URL as a JSON response
  res.json({ url: authUrl }); // Return the URL to the frontend
});

// Exchange authorization code for access token and create session cookie
app.get("/auth/token", async (req, res) => {
  // 1. Extract the authorization code from the query parameters
  const { code } = req.query;
  console.log("Received request with authorization code:", code);

  // 2. Check if the code exists
  if (!code) {
    console.warn("No authorization code provided.");
    return res
      .status(400)
      .json({ message: "Authorization code must be provided" });
  }

  try {
    // 3. Prepare parameters for the token request
    const tokenParam = getTokenParams(code);
    console.log("Token parameters:", tokenParam);

    // 4. Exchange authorization code for access token and ID token
    const response = await axios.post(config.tokenUrl, tokenParam);
    const id_token = response.data.id_token; // Extract ID token
    const refresh_token = response.data.refresh_token; // Extract refresh token
    console.log(refresh_token);

    // 5. Set refresh token as credentials for future requests
    oauth2Client.setCredentials({ refresh_token }); // Store in-memory
    console.log("Refresh token is set as credentials to oauthClient");

    // 6. Check if ID token is present
    if (!id_token) {
      console.warn("No id_token returned from OAuth server.");
      return res.status(400).json({ message: "Authorization error" });
    }

    // 7. Decode the ID token to get user information
    const { email, name, picture } = jwt.decode(id_token);
    console.log("User info:", { email, name, picture });

    // 8. Create or update the user in your database
    const user = { name, email, picture };
    let dbUser = await User.findOne({ email });
    if (!dbUser) {
      dbUser = new User({
        email,
        name,
        refreshToken: refresh_token, // Store refresh token in the database
      });
    } else {
      dbUser.refreshToken = refresh_token; // Update if user already exists
    }
    await dbUser.save();

    // 9. Generate a JWT for the session
    const token = jwt.sign({ user }, config.tokenSecret, {
      expiresIn: config.tokenExpiration,
    });

    // 10. Set the JWT in an HTTP-only, secure cookie
    console.log("Setting cookie with JWT...");
    res.cookie("token", token, {
      maxAge: config.tokenExpiration * 1000,
      httpOnly: true, // Cannot be accessed by JavaScript
      sameSite: "None", // Allow cross-site access (if needed)
      secure: true, // Send only over HTTPS
    });

    // 11. Send the user information in the response
    res.json({ user });
  } catch (err) {
    // 12. Handle errors during the token exchange
    console.error("Error in token exchange:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to check if user is logged in and refresh token if valid
app.get("/auth/logged_in", (req, res) => {
  try {
    // Log for debugging
    console.log("Checking login status...");

    //  Retrieve the token from the cookies
    const token = req.cookies.token;

    //  Check if token exists
    if (!token) {
      console.warn("No token found in cookies.");
      return res.json({ loggedIn: false }); // User is not logged in
    }

    //  Verify and decode the token
    console.log("Token found, verifying...");
    const decoded = jwt.verify(token, config.tokenSecret);

    //  Refresh the token
    const newToken = jwt.sign({ user: decoded.user }, config.tokenSecret, {
      expiresIn: config.tokenExpiration,
    });

    //  Set a new cookie with the refreshed token (if applicable)
    console.log("Resetting cookie with new token...");
    res.cookie("token", newToken, {
      maxAge: config.tokenExpiration * 1000, // Cookie expiration time in milliseconds
      httpOnly: true,
      sameSite: "None",
      // secure: true,
    });

    //  Send response indicating user is logged in and provide user data
    res.json({ loggedIn: true, user: decoded.user });
  } catch (err) {
    //  Error handling: If token is invalid or expired, return logged out status
    console.error("Error in checking login status:", err); // Log the error for debugging
    res.json({ loggedIn: false });
  }
});

// Logout route for a specific user
app.post("/auth/logout/:email", auth, async (req, res) => {
  console.log("Logging out and clearing cookie...");

  try {
    //  Get user's email from the request parameters
    const email = req.params.email;

    //  Find the user in the database
    const dbUser = await User.findOne({ email });

    //  Handle case where user is not found
    if (!dbUser) {
      return res.status(404).json({ message: "User not found" });
    }

    //  Clear the user's refresh token in the database
    dbUser.refreshToken = null;
    await dbUser.save(); // Save the updated user document

    //  Clear the authentication cookie from the browser
    res.clearCookie("token", {
      httpOnly: true, // Ensure cookie is only accessible from HTTP(S), not client-side JavaScript
      sameSite: "None", // Allow the cookie to be sent with cross-origin requests (if needed)
      secure: true, // Only send the cookie over HTTPS (recommended for production)
    });

    //  Send a success response to the frontend
    res.json({ message: "Logged out" });
  } catch (err) {
    //  Error handling
    console.error("Error in logout:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Sample protected endpoint to fetch user posts
// Sample protected endpoint to fetch user posts (placeholder data)
app.get("/user/posts", auth, async (req, res) => {
  console.log("Fetching user posts...");

  try {
    // Fetch posts from an external API (replace with your actual data source)
    const { data } = await axios.get(config.postUrl); // Uses the placeholder URL from config

    // Send the first 5 posts as a JSON response
    res.json({ posts: data.slice(0, 5) });
  } catch (err) {
    // Error handling for fetching posts
    console.error("Error fetching posts:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to schedule an event on the user's Google Calendar
app.post("/schedule-event/:email", auth, async (req, res) => {
  try {
    const email = req.params.email;
    const requestBody = req.body; // Get event details from the request body

    // Retrieve the user from the database
    const dbUser = await User.findOne({ email });

    // Set the refresh token for authentication
    oauth2Client.setCredentials({ refresh_token: dbUser.refreshToken });

    // Create a calendar instance with the authenticated client
    const calendar = google.calendar({ version: "v3" });

    // Insert the event into the user's calendar
    const event = await calendar.events.insert({
      calendarId: "primary", // Use the user's primary calendar
      auth: oauth2Client, // Authenticate the request
      requestBody,
    });

    // Extract the relevant data for the new event
    const newEvent = {
      id: event.data.id,
      summary: event.data.summary,
      description: event.data.description,
      start: event.data.start.dateTime,
      end: event.data.end.dateTime,
    };

    // Send the new event details as a JSON response
    res.json(newEvent);
  } catch (err) {
    // Handle errors that occur during the event scheduling process
    console.error("Error scheduling event:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get calendar events for a specific user from their primary Google Calendar
app.get("/calendar-events/:email", auth, async (req, res) => {
  try {
    // Create a Google Calendar API instance
    const calendar = google.calendar({ version: "v3" });

    // Get the user's email from the route parameter
    const email = req.params.email;

    // Find the user in the database
    let dbuser = await User.findOne({ email });

    // Get the user's refresh token from the database
    const DBRefreshToekn = dbuser.refreshToken;

    // Set the credentials for the OAuth2 client (including the refresh token)
    oauth2Client.setCredentials({ refresh_token: DBRefreshToekn });

    // Fetch events from the user's primary calendar
    const response = await calendar.events.list({
      auth: oauth2Client, // Use the authenticated client
      calendarId: "primary",
      timeMin: new Date().toISOString(), // Get events from today onwards
      maxResults: 10, // Limit the number of events returned (adjust as needed)
      singleEvents: true, // Expand recurring events into individual instances
      orderBy: "startTime", // Order events by start time
    });

    // Extract and format the events from the API response
    const events = response.data.items;
    const filteredEvents = events.map((event) => ({
      id: event.id,
      summary: event.summary,
      description: event.description,
      // Use either dateTime (for events with a time) or date (for all-day events)
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
    }));

    console.log(filteredEvents); // Log the events (for debugging)

    // Send the filtered events as JSON response
    res.json(filteredEvents);
  } catch (err) {
    // Handle errors that occur during event fetching
    console.error("Error fetching events:", err);

    // Check if the error is due to an expired token
    if (err.code === 401) {
      return res.status(401).json({ message: "Token expired" });
    }
    // Handle other types of errors
    res.status(500).json({ message: "Server error" });
  }
});

//delete the event based on the email and the eventid
app.delete("/delete-event/:eventId/:email", auth, async (req, res) => {
  try {
    const { eventId, email } = req.params; // Extract eventId and email
    console.log("Deleting event with ID:", eventId); 

    const dbUser = await User.findOne({ email }); // Find the user in the database

    oauth2Client.setCredentials({ refresh_token: dbUser.refreshToken }); // Set refresh token for authentication
    const calendar = google.calendar({ version: "v3", auth: oauth2Client }); 

    const event = await calendar.events.delete({      // Delete the event from Google Calendar
      calendarId: "primary",
      auth: oauth2Client,
      eventId,
    }); 
    
    // Remove the event from the user's events array in the database
    const eventIndex = dbUser.events.findIndex((e) => e.id === eventId);
    if (eventIndex > -1) {
      dbUser.events.splice(eventIndex, 1);
      await dbUser.save();
    }
    res.status(200).json({ status: "ok" }); // Indicate success
  } catch (err) {
    // Handle errors during event deletion
    console.error("Error deleting event:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Start the server
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
