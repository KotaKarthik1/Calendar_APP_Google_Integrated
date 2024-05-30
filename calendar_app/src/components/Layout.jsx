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

export default function LayoutComponent({ AuthContext }) {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const { checkLoginState, loggedIn, user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (loggedIn === false) {
      navigate('/');
    }
  }, [checkLoginState, loggedIn, navigate]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/calendar-events/${user.email}`);
        const formattedEvents = response.data.map(event => ({
          id: event.id,
          title: event.summary,
          description:event.description,
          start: event.start,
          end: event.end,
        }));
        setEvents(formattedEvents);
        console.log(formattedEvents);
      } catch (error) {
        console.error("get events:", error);
      }
    };

    fetchEvents();
  }, [user.email]);

  const logoutHandler = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      axios.post('http://localhost:5000/auth/logout')
      .then(() => {
        window.location.reload();
      })
      .catch(error => {
        console.error("Logout error:", error);
      });
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
        <button 
          type="button" 
          onClick={() => navigate('/eventform')}
        >
          Add Event Manually
        </button>
        <button 
          type="button" 
          onClick={() => navigate('/profile')}
        >
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
        <EventPopup events={selectedEvent} onClose={() => setShowPopup(false)} />
      )}
    </div>
  );
}
