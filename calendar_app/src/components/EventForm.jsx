import React, { useState, useContext, useEffect } from "react";
import axios from "redaxios";
import { DateTime } from "luxon";
import { useLocation, useNavigate } from "react-router-dom";
import "./css/EventForm.css";

function EventForm({ AuthContext }) {
  // Get the current user from the authentication context
  const { user } = useContext(AuthContext);

  // Get the location object to access passed state
  const location = useLocation();

  // Get the navigation function for redirection
  const navigate = useNavigate();

  // Extract the selected date from the location state
  const { selectedDate } = location.state || {};
  console.log('Selected Date:', selectedDate); 

  // State variables for form input values
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [eventCreated, setEventCreated] = useState(false);

  // Initialize event start and end times based on the selected date
  useEffect(() => {
    if (selectedDate) {
      // Calculate default start and end times
      const defaultStartTime = DateTime.fromISO(selectedDate)
        .set({ hour: 9, minute: 0 }) // 9:00 AM
        .toISO({ includeOffset: false })
        .replace(/\.\d{3}Z$/, ""); // Remove milliseconds and 'Z'
      const defaultEndTime = DateTime.fromISO(selectedDate)
        .set({ hour: 18, minute: 0 }) // 6:00 PM
        .toISO({ includeOffset: false })
        .replace(/\.\d{3}Z$/, "");

      setEventStart(defaultStartTime);
      setEventEnd(defaultEndTime);
    }
  }, [selectedDate]); // Run only when selectedDate changes

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission

    try {
      // Prepare the request body for the new event
      const requestBody = {
        summary: eventTitle || "New Event",
        description: eventDescription || "",
        start: {
          dateTime: DateTime.fromISO(eventStart).toISO(), // Convert to ISO string
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Get user's timezone
        },
        end: {
          dateTime: DateTime.fromISO(eventEnd).toISO(), // Convert to ISO string
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      // Send the event creation request to the backend
      const response = await axios.post(
        `https://calendar-app-google-integrated.vercel.app/schedule-event/${user.email}`,
        requestBody,
        { withCredentials: true } 
      );

      console.log("Event added successfully:", response.data);

      // Show a success message (you can replace this with better UI feedback)
      setEventCreated(true);
      // Redirect back to the calendar or home page
      setTimeout(() => {
        navigate("/");
      }, 2000); // Redirect after 2 seconds (adjust the delay as needed)
    } catch (error) {
      // Handle errors, including token expiration
      console.error("Error adding event:", error);
      if (
        error.response &&
        error.response.status === 401 &&
        error.response.data.message === "Token expired"
      ) {
        navigate("/"); // Redirect to login on token expiration
      }
      // Handle other types of errors here...
    }
  };

  return (
    // Event form JSX with added comments
    <div className="event-form-container">
      <h2>Create New Event</h2>
      <form onSubmit={handleSubmit}>
        {/* ... your form fields for title, description, start, end ... */}
      </form>

      {eventCreated && (
        <p className="success-message">Event created successfully!</p>
      )} 
    </div>
  );
}

export default EventForm;
