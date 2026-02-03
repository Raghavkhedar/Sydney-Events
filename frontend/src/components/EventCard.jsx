import { useState } from "react";
import EmailModal from "./EmailModal";

const EventCard = ({ event }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
        {/* Image Container */}
        <div className="relative overflow-hidden h-56 bg-gradient-to-br from-indigo-100 to-purple-100">
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-16 h-16 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>

        <div className="p-5">
          <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 min-h-[3.5rem] group-hover:text-indigo-600 transition-colors">
            {event.title}
          </h3>

          {/* Description */}
          {event.description && event.description.trim() && (
            <div className="mb-4 pb-4 border-b border-gray-100">
              <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                {event.description}
              </p>
            </div>
          )}

          <div className="space-y-3 mb-5">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Date</p>
                <p className="text-sm font-medium text-gray-700">
                  {(() => {
                    // Try multiple ways to parse the date
                    let date = null;
                    
                    if (event.dateTime) {
                      try {
                        // If it's already a Date object
                        if (event.dateTime instanceof Date) {
                          date = event.dateTime;
                        } 
                        // If it's a string (ISO format or other)
                        else if (typeof event.dateTime === 'string') {
                          date = new Date(event.dateTime);
                        }
                        // If it's an object with $date (MongoDB format)
                        else if (event.dateTime.$date) {
                          date = new Date(event.dateTime.$date);
                        }
                        // If it's a timestamp
                        else if (typeof event.dateTime === 'number') {
                          date = new Date(event.dateTime);
                        }
                        
                        if (date && !isNaN(date.getTime())) {
                          return date.toLocaleString("en-AU", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          });
                        }
                      } catch (e) {
                        console.error("Date parsing error:", e);
                      }
                    }
                    
                    // Fallback 1: Use dateText if available (raw date string from scraper)
                    if (event.dateText && event.dateText.trim()) {
                      // Clean up the dateText - extract just the date part
                      const cleanDateText = event.dateText
                        .replace(/\n/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                      
                      // Try to extract common date patterns
                      const datePatterns = [
                        /(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+\d{1,2}:?\d{0,2}\s*(am|pm)/i,
                        /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)day\s+at\s+\d{1,2}:?\d{0,2}\s*(am|pm)/i,
                        /\d{1,2}(st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}/i,
                      ];
                      
                      for (const pattern of datePatterns) {
                        const match = cleanDateText.match(pattern);
                        if (match) {
                          return match[0];
                        }
                      }
                      
                      // If no pattern matches, return first 50 chars of dateText
                      return cleanDateText.substring(0, 50);
                    }
                    
                    // Fallback 2: Try to extract date from title if it contains date info
                    if (event.title) {
                      const dateMatch = event.title.match(/(\d{1,2}(st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i);
                      if (dateMatch) {
                        return dateMatch[1];
                      }
                    }
                    
                    return "TBA";
                  })()}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Venue</p>
                <p className="text-sm font-medium text-gray-700">
                  {(() => {
                    // Check venueName first
                    if (event.venueName && event.venueName.trim() && 
                        event.venueName !== "TBD" && 
                        event.venueName !== "TBA" &&
                        !event.venueName.toLowerCase().includes("tbd")) {
                      return event.venueName;
                    }
                    
                    // Fallback to venueAddress if venueName is not available
                    if (event.venueAddress && event.venueAddress.trim()) {
                      return event.venueAddress;
                    }
                    
                    // Fallback: Try to extract venue from title or description
                    if (event.title) {
                      // Look for common venue patterns in title
                      const venuePatterns = [
                        /at\s+([A-Z][a-zA-Z\s&]+?)(?:\s+-\s+|$|,)/,
                        /@\s+([A-Z][a-zA-Z\s&]+?)(?:\s+-\s+|$|,)/,
                      ];
                      
                      for (const pattern of venuePatterns) {
                        const match = event.title.match(pattern);
                        if (match && match[1]) {
                          return match[1].trim();
                        }
                      }
                    }
                    
                    return "TBA";
                  })()}
                </p>
              </div>
            </div>

            {event.venueAddress && event.venueAddress.trim() && event.venueName && event.venueName.trim() && event.venueName !== event.venueAddress && (
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-xs text-gray-500 line-clamp-1">{event.venueAddress}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Tickets
          </button>
        </div>
      </div>

      {showModal && (
        <EmailModal
          event={event}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default EventCard;
