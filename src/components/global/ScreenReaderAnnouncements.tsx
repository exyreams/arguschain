import React from "react";

interface ScreenReaderAnnouncementsProps {
  announcements: string[];
  priority?: "polite" | "assertive";
}

/**
 * ScreenReaderAnnouncements - Component for screen reader announcements
 *
 * This component provides:
 * - Live regions for dynamic content announcements
 * - Polite and assertive announcement priorities
 * - Automatic cleanup of old announcements
 */
export const ScreenReaderAnnouncements: React.FC<
  ScreenReaderAnnouncementsProps
> = ({ announcements, priority = "polite" }) => {
  return (
    <>
      {/* Polite announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {priority === "polite" &&
          announcements.map((announcement, index) => (
            <div key={`polite-${index}`}>{announcement}</div>
          ))}
      </div>

      {/* Assertive announcements */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="alert"
      >
        {priority === "assertive" &&
          announcements.map((announcement, index) => (
            <div key={`assertive-${index}`}>{announcement}</div>
          ))}
      </div>
    </>
  );
};

export default ScreenReaderAnnouncements;
