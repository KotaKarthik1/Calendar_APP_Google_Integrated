import React, { useState, useContext, useEffect } from "react";
import axios from "redaxios";
import { DateTime } from "luxon";
import { useLocation, useNavigate } from "react-router-dom";
import "./css/EventForm.css"; // Import the CSS file

function EventForm({ AuthContext }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedDate } = location.state || {};
  console.log('Selected Date:', selectedDate);  // Debugging log

  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [eventCreated, setEventCreated] = useState(false); // State to track event creation

  useEffect(() => {
    if (selectedDate) {
      const defaultStartTime = DateTime.fromISO(selectedDate)
        .set({ hour: 9, minute: 0 })
        .toISO({ includeOffset: false })
        .replace(/\.\d{3}Z$/, "");
      const defaultEndTime = DateTime.fromISO(selectedDate)
        .set({ hour: 18, minute: 0 })
        .toISO({ includeOffset: false })
        .replace(/\.\d{3}Z$/, "");

      setEventStart(defaultStartTime);
      setEventEnd(defaultEndTime);
    }
  }, [selectedDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const requestBody = {
        summary: eventTitle || "New Event",
        description: eventDescription || "",
        start: {
          dateTime: DateTime.fromISO(eventStart).toISO(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: DateTime.fromISO(eventEnd).toISO(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      const response = await axios.post(
        `http://localhost:5000/schedule-event/${user.email}`,
        requestBody
      );

      console.log("Event added successfully:", response.data);
      setEventCreated(true); // Set eventCreated to true when event is added successfully
      setTimeout(() => {
        navigate("/");
      }, 2000); // Redirect after 2 seconds
    } catch (error) {
      console.error("Error adding event:", error);
      if (
        error.response &&
        error.response.status === 401 &&
        error.response.data.message === "Token expired"
      ) {
        navigate("/");
        return;
      }
    }
  };

  return (
    <div className="event-form-container">
      <h2>Create New Event</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="eventTitle">Title:</label>
          <input
            type="text"
            id="eventTitle"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="eventDescription">Description:</label>
          <textarea
            id="eventDescription"
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="eventStart">Start Date and Time:</label>
          <input
            type="datetime-local"
            id="eventStart"
            value={eventStart}
            onChange={(e) => setEventStart(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="eventEnd">End Date and Time:</label>
          <input
            type="datetime-local"
            id="eventEnd"
            value={eventEnd}
            onChange={(e) => setEventEnd(e.target.value)}
            required
          />
        </div>

        <button type="submit">Create Event</button>
      </form>
      {eventCreated && <p className="success-message">Event created successfully!</p>} {/* Success message */}
    </div>
  );
}

export default EventForm;
