import React from "react";
import { DateTime } from "luxon";

function EventPopup({ events, onClose }) {
    console.log(events[0]);
  const formatDateTime = (dateTimeString, timezone = 'local') => {
    // console.log(dateTimeString);
    // Convert to a JavaScript Date object
    const jsDate = new Date(dateTimeString);
    const dt = DateTime.fromJSDate(jsDate, { zone: timezone });
    if (dt.isValid) {
      return dt.toLocaleString(DateTime.DATETIME_MED);
    } else {
      console.error("Invalid date:", dateTimeString);
      return "Invalid date";
    }
  };

  return (
    <div
      className="popup"
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: "white", // White background
        padding: "20px",
        border: "1px solid #333", // Dark gray border
        borderRadius: "5px",
        zIndex: 1000,
        boxShadow: "0 2px 5px rgba(0,0,0,0.5)", // Darker shadow
      }}
    >
      <div
        className="popup-content"
        style={{
          maxHeight: "400px",
          overflowY: "auto",
          color: "black", // Black text
        }}
      >
        <h2 style={{ marginBottom: "10px", color: "#333" }}>
          {/* Dark gray heading */}
          Events on this Day:
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {events.map((event, index) => (
            console.log(event),
            <li key={index} style={{ marginBottom: "8px" }}>
              <b style={{ fontWeight: "bold" }}>{event.title}</b> -{" "}
              <b style={{ fontWeight: "bold" }}>{event.extendedProps && event.extendedProps.description && <>{event.extendedProps.description}-{" "}</>}</b>
              <span style={{ color: "#555" }}>
                {formatDateTime(event.start, event.timeZone || "local")} -{" "}
                {formatDateTime(event.end, event.timeZone || "local")}
              </span>{" "}
              {/* Gray time */}
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          style={{
            marginTop: "15px",
            padding: "8px 12px",
            backgroundColor: "white", // White button
            color: "black",
            border: "1px solid #333", // Dark gray border
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default EventPopup;
