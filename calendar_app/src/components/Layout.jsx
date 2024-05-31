import React, { useState, useContext, useEffect } from "react";
import axios from 'redaxios';
import { useNavigate } from "react-router-dom";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import './css/Layout.css';
import EventPopup from "./EventPopup";

export default function Layout({ AuthContext }) {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const { checkLoginState, loggedIn, user, resetLoginState } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (loggedIn === false) {
      navigate('/');
    }
  }, [loggedIn, navigate]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`https://calendar-app-google-integrated.vercel.app/calendar-events/${user.email}`);
        const formattedEvents = response.data.map(event => ({
          id: event.id,
          title: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
        }));
        setEvents(formattedEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEvents();
  }, [user.email]);

  const logoutHandler = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try {
        await axios.post(`https://calendar-app-google-integrated.vercel.app/auth/logout/${user.email}`);
        resetLoginState();
        navigate('/');
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
  };

  const handleEventDelete = async (eventId) => {
    try {
      const response = await axios.delete(`https://calendar-app-google-integrated.vercel.app/delete-event/${eventId}/${user.email}`);
      if (response.data.status === "ok") {
        setEvents((prevEvents) => prevEvents.filter(event => event.id !== eventId));
        setShowPopup(false);
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const handleDateClick = (info) => {
    const clickedDate = info.dateStr;
    navigate('/eventform', { state: { selectedDate: clickedDate } });
  };

  const handleEventClick = (info) => {
    setSelectedEvent([info.event]);
    setShowPopup(true);
  };

  return (
    <div>
      <h1>Event Calendar</h1>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '10px' }}>
        <button 
          type="button" 
          style={{ backgroundColor: 'white', color: 'black', border: '1px solid black' }}
          onClick={logoutHandler}
        >
          Logout
        </button>
        <button type="button" onClick={() => navigate('/eventform')}>
          Add Event Manually
        </button>
        <button type="button" onClick={() => navigate('/profile')}>
          Profile
        </button>
      </div>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
        }}
        initialView="dayGridMonth"
        events={events}
        height="auto"
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        dayCellContent={(e) => (
          <>
            {e.dayNumberText}
            <button onClick={() => handleDateClick({ dateStr: e.dateStr })}>+</button>
          </>
        )}
      />
      {showPopup && selectedEvent && (
        <EventPopup events={selectedEvent} onClose={() => setShowPopup(false)} onDelete={handleEventDelete} />
      )}
    </div>
  );
}
