import React, { useState, useContext, useEffect } from "react";
import axios from "redaxios";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import "./css/Layout.css";
import EventPopup from "./EventPopup";

export default function Layout({ AuthContext }) {
  // States for managing events, selected event, and popup visibility
  const [events, setEvents] = useState([]); // Array to store fetched events
  const [selectedEvent, setSelectedEvent] = useState(null); // Currently selected event
  const [showPopup, setShowPopup] = useState(false); // Boolean to control popup

  // Get values from the AuthContext
  const { checkLoginState, loggedIn, user, resetLoginState } = useContext(
    AuthContext
  );
  const navigate = useNavigate();

  // Redirect to login if user is not logged in
  useEffect(() => {
    if (loggedIn === false) {
      navigate("/");
    }
  }, [loggedIn, navigate]);

  // Fetch events when the component mounts and when user.email changes
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(
          `https://calendar-app-google-integrated.vercel.app/calendar-events/${user.email}`
        );
        const formattedEvents = response.data.map((event) => ({
          id: event.id,
          title: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
        }));
        setEvents(formattedEvents); // Update events state
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEvents();
  }, [user.email]);

  // Handle logout action
  const logoutHandler = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try {
        await axios.post(
          `https://calendar-app-google-integrated.vercel.app/auth/logout/${user.email}`
        );
        resetLoginState(); // Reset the login state
        navigate("/"); // Navigate to the login page
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
  };

  // Handle event deletion
  const handleEventDelete = async (eventId) => {
    try {
      const response = await axios.delete(
        `https://calendar-app-google-integrated.vercel.app/delete-event/${eventId}/${user.email}`
      );
      if (response.data.status === "ok") {
        // Filter out the deleted event from the state
        setEvents((prevEvents) =>
          prevEvents.filter((event) => event.id !== eventId)
        );
        setShowPopup(false); // Close the event popup
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      // Consider showing an error message to the user
    }
  };

  // Handle date click (navigate to event form)
  const handleDateClick = (info) => {
    const clickedDate = info.dateStr;
    navigate("/eventform", { state: { selectedDate: clickedDate } });
  };

  // Handle event click (show popup)
  const handleEventClick = (info) => {
    setSelectedEvent([info.event]);
    setShowPopup(true);
  };

  return (
    <div>
      <h1>Event Calendar</h1>

      {/* Logout, Add Event Manually, and Profile buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
          marginBottom: "10px",
        }}
      >
        <button
          type="button"
          style={{ backgroundColor: "white", color: "black", border: "1px solid black" }}
          onClick={logoutHandler}
        >
          Logout
        </button>
        <button type="button" onClick={() => navigate("/eventform")}>
          Add Event Manually
        </button>
        <button type="button" onClick={() => navigate("/profile")}>
          Profile
        </button>
      </div>

      {/* FullCalendar component */}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
        }}
        initialView="dayGridMonth"
        events={events}
        height="auto"
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        // Add a "+" button to each day cell to create a new event
        dayCellContent={(e) => (
          <>
            {e.dayNumberText}
            <button onClick={() => handleDateClick({ dateStr: e.dateStr })}>
              +
            </button>
          </>
        )}
      />

      {/* Event Popup (conditionally rendered) */}
      {showPopup && selectedEvent && (
        <EventPopup
          events={selectedEvent}
          onClose={() => setShowPopup(false)}
          onDelete={handleEventDelete}
        />
      )}
    </div>
  );
}
