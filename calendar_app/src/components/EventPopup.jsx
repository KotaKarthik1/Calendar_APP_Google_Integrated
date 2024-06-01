import React from "react";
import { DateTime } from "luxon";

function EventPopup({ events, onClose, onDelete }) {
  console.log(events[0]); // Check the first event for debugging

  // Function to format the date and time
  const formatDateTime = (dateTimeString, timezone = 'local') => {
    // Create a JavaScript Date object from the input string
    const jsDate = new Date(dateTimeString);
    const dt = DateTime.fromJSDate(jsDate, { zone: timezone }); 

    if (dt.isValid) { 
      // Format the date and time if valid
      return dt.toLocaleString(DateTime.DATETIME_MED); // e.g., "May 30, 2024, 10:15 AM"
    } else {
      // Handle invalid dates
      console.error("Invalid date:", dateTimeString);
      return "Invalid date"; 
    }
  };

  return (
    // Main popup container
    <div
      className="popup"
      style={{
        position: "fixed",        
        top: "50%",               
        left: "50%",              
        transform: "translate(-50%, -50%)", 
        backgroundColor: "black",  
        padding: "20px",          
        border: "1px solid #333",  
        borderRadius: "5px",
        zIndex: 1000,            
        boxShadow: "0 2px 5px rgba(0,0,0,0.5)", // Shadow
      }}
    >
      <div
        className="popup-content"
        style={{
          maxHeight: "400px",    
          overflowY: "auto",     
          color: "black",       
        }}
      >
        {/* Title */}
        <h2 style={{ marginBottom: "10px", color: "#333" }}>Events on this Day:</h2>

        {/* List of events */}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {events.map((event, index) => (
            <li key={index} style={{ marginBottom: "8px" }}>
              {/* Event title */}
              <b style={{ fontWeight: "bold",color: "white" }}>{event.title}</b> -{" "}
              
              {/* Event description (if available) */}
              {event.extendedProps && event.extendedProps.description && (
                <>
                  <b style={{ fontWeight: "bold",color: "#555" }}>{event.extendedProps.description} - </b>
                </>
              )}

              {/* Event start and end times */}
              <span style={{ color: "#555" }}> 
                {formatDateTime(event.start, event.timeZone || "local")} -{" "}
                {formatDateTime(event.end, event.timeZone || "local")}
              </span>
            </li>
          ))}
        </ul>

        {/* Buttons */}
        <div style={{ marginTop: "15px" }}>
          <button onClick={onClose} style={{ marginRight: "10px" }}>
            Close
          </button>
          <button
            onClick={() => onDelete(events[0].id)} // Call onDelete with the first event's ID
            style={{ marginTop: "15px", padding: "8px 12px", backgroundColor: "white", color: "black", border: "1px solid #333", borderRadius: "5px", cursor: "pointer" }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default EventPopup;
