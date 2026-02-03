const puppeteer = require("puppeteer");
const Event = require("../models/Event");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

const EVENTBRITE_URL = "https://www.eventbrite.com.au/d/australia--sydney/events/";

// Helper function to replace waitForTimeout
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const scrapeEventbrite = async () => {
  let browser;
  
  try {
    console.log("🔍 Starting Eventbrite scraper...");

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    console.log("📄 Loading page...");
    await page.goto(EVENTBRITE_URL, { 
      waitUntil: "networkidle2",
      timeout: 30000 
    });

    // ✅ FIXED: Use delay function instead of waitForTimeout
    await delay(3000);

    console.log("📜 Scrolling to load more events...");
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, window.innerHeight);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    });

    // ✅ FIXED: Use delay function
    await delay(2000);

    // Take screenshot for verification
    await page.screenshot({
      path: "eventbrite-debug.png",
      fullPage: true,
    });
    console.log("📸 Screenshot saved");

    console.log("🔍 Extracting event data...");

    // Extract events
    const events = await page.evaluate(() => {
      const data = [];
      
      // Try multiple possible card containers
      const cardSelectors = [
        'div[class*="discover-search-desktop-card"]',
        'div[class*="event-card"]',
        'article',
        'div[data-testid*="event"]',
        'a[href*="/e/"]',
      ];

      let cards = [];
      
      // Find which selector works
      for (const selector of cardSelectors) {
        cards = document.querySelectorAll(selector);
        if (cards.length > 0) {
          break;
        }
      }

      // Fallback: Find all links that point to event pages
      if (cards.length === 0) {
        const allLinks = document.querySelectorAll('a[href*="eventbrite.com"]');
        cards = Array.from(allLinks).filter(link => {
          const href = link.href || '';
          return href.includes('/e/') && !href.includes('/d/') && !href.includes('/o/');
        });
      }

      cards.forEach((card) => {
        try {
          // Get title
          let title = '';
          const titleSelectors = [
            'h3',
            'h2',
            'div[class*="title"]',
            'span[class*="title"]',
            '[data-testid*="title"]',
          ];

          for (const sel of titleSelectors) {
            const elem = card.querySelector(sel);
            if (elem && elem.innerText?.trim()) {
              title = elem.innerText.trim();
              break;
            }
          }

          // If still no title, use link text
          if (!title && card.tagName === 'A') {
            title = card.innerText?.trim() || '';
          }

          // Get URL
          let sourceUrl = '';
          if (card.tagName === 'A') {
            sourceUrl = card.href;
          } else {
            const link = card.querySelector('a[href*="/e/"]');
            sourceUrl = link?.href || '';
          }

          // Get image
          let imageUrl = '';
          const img = card.querySelector('img');
          if (img) {
            imageUrl = img.src || img.getAttribute('data-src') || img.getAttribute('srcset')?.split(' ')[0] || '';
          }

          // Get date/time - avoid ticket status messages
          let dateText = '';
          const dateSelectors = [
            'time[datetime]', // Prefer time elements with datetime attribute
            'time',
            '[class*="date"]:not([class*="status"]):not([class*="ticket"])',
            '[class*="time"]:not([class*="status"]):not([class*="ticket"])',
            '[data-testid*="date"]',
            '[data-testid*="time"]',
          ];

          // Status messages to ignore
          const statusMessages = [
            'almost full',
            'selling quickly',
            'sales end soon',
            'sold out',
            'limited availability',
            'few tickets left',
          ];

          for (const sel of dateSelectors) {
            const elem = card.querySelector(sel);
            if (elem) {
              const text = elem.innerText?.trim() || '';
              const datetimeAttr = elem.getAttribute('datetime') || '';
              
              // Prefer datetime attribute if available
              if (datetimeAttr) {
                dateText = datetimeAttr;
                break;
              }
              
              // Check if it's a status message (case insensitive)
              const isStatusMessage = statusMessages.some(status => 
                text.toLowerCase().includes(status)
              );
              
              // Only use if it looks like a date and not a status message
              if (text && !isStatusMessage && (text.match(/\d/) || text.match(/(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i))) {
                dateText = text;
                break;
              }
            }
          }
          
          // Fallback: look for date-like patterns in all text elements
          if (!dateText) {
            const allTextElements = card.querySelectorAll('p, span, div');
            for (const elem of allTextElements) {
              const text = elem.innerText?.trim() || '';
              const isStatusMessage = statusMessages.some(status => 
                text.toLowerCase().includes(status)
              );
              
              // Look for date patterns: day names, month names, or date numbers
              if (text && !isStatusMessage && 
                  (text.match(/\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i) ||
                   text.match(/(mon|tue|wed|thu|fri|sat|sun).*\d/i) ||
                   text.match(/\d{1,2}[\/\-]\d{1,2}/))) {
                dateText = text;
                break;
              }
            }
          }

          // Get venue/location
          let venueName = '';
          const venueSelectors = [
            '[data-testid="venue"]',
            '[class*="venue"]',
            '[class*="location"]',
            'p:nth-of-type(2)',
          ];

          for (const sel of venueSelectors) {
            const elem = card.querySelector(sel);
            if (elem && elem.innerText?.trim()) {
              venueName = elem.innerText.trim();
              break;
            }
          }

          // Get description
          let description = '';
          const descElem = card.querySelector('p');
          if (descElem) {
            description = descElem.innerText?.trim() || '';
          }

          // Only add if we have at least title and URL
          if (title && sourceUrl && sourceUrl.includes('eventbrite')) {
            data.push({
              title: title.substring(0, 200),
              dateText,
              venueName,
              imageUrl,
              sourceUrl,
              description: description.substring(0, 500),
            });
          }
        } catch (err) {
          // Skip problematic cards
        }
      });

      return data;
    });

    console.log(`🟢 Found ${events.length} events`);

    if (events.length === 0) {
      console.warn("⚠️ No events extracted");
      
      // Debug: Save page HTML
      const html = await page.content();
      const fs = require('fs');
      fs.writeFileSync('eventbrite-debug.html', html);
      console.log("💾 Saved page HTML to eventbrite-debug.html for inspection");
      
      return;
    }

    // Log first few events as samples
    console.log("\n📋 Sample events:");
    events.slice(0, 3).forEach((event, i) => {
      console.log(`\n${i + 1}. ${event.title}`);
      console.log(`   Date: ${event.dateText || 'N/A'}`);
      console.log(`   Venue: ${event.venueName || 'N/A'}`);
      console.log(`   URL: ${event.sourceUrl.substring(0, 60)}...`);
    });

    // Save to database
    console.log("\n💾 Saving to database...");
    let newCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const eventData of events) {
      try {
        const existingEvent = await Event.findOne({
          sourceUrl: eventData.sourceUrl,
        });

        if (!existingEvent) {
          const parsedDate = parseDateText(eventData.dateText);
          await Event.create({
            title: eventData.title,
            dateTime: parsedDate,
            dateText: eventData.dateText || "", // Store raw date text as fallback
            venueName: eventData.venueName || "TBD",
            venueAddress: "",
            city: "Sydney",
            description: eventData.description || "",
            category: [],
            imageUrl: eventData.imageUrl || "",
            sourceName: "Eventbrite",
            sourceUrl: eventData.sourceUrl,
            lastScraped: new Date(),
            status: "new",
          });
          newCount++;
        } else {
          let hasChanges = false;

          if (existingEvent.title !== eventData.title) {
            existingEvent.title = eventData.title;
            hasChanges = true;
          }
          if (existingEvent.venueName !== eventData.venueName && eventData.venueName) {
            existingEvent.venueName = eventData.venueName;
            hasChanges = true;
          }
          // Update dateTime and dateText if we have new date data
          if (eventData.dateText) {
            const newDateTime = parseDateText(eventData.dateText);
            if (newDateTime && (!existingEvent.dateTime || existingEvent.dateTime.getTime() !== newDateTime.getTime())) {
              existingEvent.dateTime = newDateTime;
              existingEvent.dateText = eventData.dateText;
              hasChanges = true;
            } else if (!existingEvent.dateTime && eventData.dateText) {
              // If dateTime is null but we have dateText, store it
              existingEvent.dateText = eventData.dateText;
              hasChanges = true;
            }
          }
          if (existingEvent.description !== eventData.description && eventData.description) {
            existingEvent.description = eventData.description;
            hasChanges = true;
          }
          if (existingEvent.imageUrl !== eventData.imageUrl && eventData.imageUrl) {
            existingEvent.imageUrl = eventData.imageUrl;
            hasChanges = true;
          }

          existingEvent.lastScraped = new Date();
          
          if (hasChanges) {
            existingEvent.status = "updated";
          }

          await existingEvent.save();
          updatedCount++;
        }
      } catch (err) {
        console.error(`❌ Error saving event: ${eventData.title}`, err.message);
        errorCount++;
      }
    }

    console.log(`\n✅ Eventbrite scraping completed:`);
    console.log(`   📝 New events: ${newCount}`);
    console.log(`   🔄 Updated events: ${updatedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

  } catch (error) {
    console.error("❌ Eventbrite scraper failed:", error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log("🔒 Browser closed");
    }
  }
};

// function parseDateText(dateText) {
//   if (!dateText) return null;

//   try {
//     // Clean up common Eventbrite date formats
//     let cleanedDate = dateText
//       .replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s*/i, '')
//       .replace(/\s+at\s+/i, ' ')
//       .trim();

//     const date = new Date(cleanedDate);
    
//     if (isNaN(date.getTime())) {
//       // Try parsing with current year
//       const year = new Date().getFullYear();
//       const withYear = `${cleanedDate.split(',')[0]}, ${year} ${cleanedDate.split(',').slice(1).join(',')}`;
//       const date2 = new Date(withYear);
      
//       if (!isNaN(date2.getTime())) {
//         return date2;
//       }
      
//       console.warn(`⚠️ Could not parse date: ${dateText}`);
//       return null;
//     }
    
//     return date;
//   } catch (err) {
//     console.warn(`⚠️ Date parsing error for "${dateText}":`, err.message);
//     return null;
//   }
// }

function parseDateText(dateText) {
  if (!dateText) return null;

  // Filter out status messages
  const statusMessages = [
    'almost full',
    'selling quickly',
    'sales end soon',
    'sold out',
    'limited availability',
    'few tickets left',
  ];
  
  const lowerText = dateText.toLowerCase();
  if (statusMessages.some(status => lowerText.includes(status))) {
    return null; // This is a status message, not a date
  }

  // Extract date pattern from mixed text (e.g., "Event Title\nSat, 14 Feb, 9:00 pm\nVenue")
  // Look for patterns like "Sat, 14 Feb, 9:00 pm" or "Sun, 8 Mar, 11:00 am"
  const datePattern = dateText.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec),?\s+\d{1,2}:?\d{0,2}\s*(am|pm)/i);
  if (datePattern) {
    dateText = datePattern[0]; // Use just the date portion
  }

  const year = dayjs().year();

  // If it's an ISO date string from datetime attribute, parse it directly
  if (dateText.match(/^\d{4}-\d{2}-\d{2}/)) {
    const parsed = dayjs(dateText);
    if (parsed.isValid()) {
      return parsed.toDate();
    }
  }

  // Remove timezone info (e.g., "GMT+5:30") for parsing
  let cleaned = dateText
    .replace(/\s+GMT[+-]\d{1,2}:?\d{0,2}/i, '')
    .replace(/\s+at\s+/i, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Handle "Sat, 14 Feb, 9:00 pm" format (most common Eventbrite format)
  const commonFormatMatch = cleaned.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec),?\s+(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
  if (commonFormatMatch) {
    const [, , day, month, hour, minute, ampm] = commonFormatMatch;
    const monthIndex = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(month.toLowerCase());
    if (monthIndex !== -1) {
      let hour24 = parseInt(hour);
      const min = minute ? parseInt(minute) : 0;
      if (ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
      if (ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
      
      const parsed = dayjs().year(year).month(monthIndex).date(parseInt(day)).hour(hour24).minute(min).second(0);
      if (parsed.isValid() && parsed.isAfter(dayjs())) {
        return parsed.toDate();
      }
    }
  }

  // Handle "Saturday at 2:00 PM" format
  const dayAtTimeMatch = cleaned.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)day\s+at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
  if (dayAtTimeMatch) {
    const [, dayName, hour, minute, ampm] = dayAtTimeMatch;
    const dayIndex = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(dayName.toLowerCase());
    if (dayIndex !== -1) {
      const today = dayjs();
      const currentDayIndex = today.day();
      const daysUntil = (dayIndex - currentDayIndex + 7) % 7 || 7;
      const targetDay = today.add(daysUntil, 'day');
      
      let hour24 = parseInt(hour);
      const min = minute ? parseInt(minute) : 0;
      if (ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
      if (ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
      
      return targetDay.hour(hour24).minute(min).second(0).toDate();
    }
  }

  // Normalize text (remove day name prefix if present)
  cleaned = cleaned
    .replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s*/i, "")
    .trim();

  // Try parsing with current year
  const formats = [
    "D MMM, h:mm A YYYY",
    "D MMM h:mm A YYYY",
    "D MMMM, h:mm A YYYY",
    "D MMMM h:mm A YYYY",
    "MMM D, h:mm A YYYY",
    "MMMM D, h:mm A YYYY",
    "D MMM YYYY h:mm A",
    "D MMMM YYYY h:mm A",
  ];

  for (const format of formats) {
    const parsed = dayjs(`${cleaned} ${year}`, format);
    if (parsed.isValid()) {
      return parsed.toDate();
    }
  }

  // Try parsing without year (assume current year)
  for (const format of formats.map(f => f.replace(" YYYY", ""))) {
    const parsed = dayjs(cleaned, format);
    if (parsed.isValid()) {
      return parsed.year(year).toDate();
    }
  }

  // Fallback: Try native Date parsing
  try {
    const nativeDate = new Date(dateText);
    if (!isNaN(nativeDate.getTime())) {
      return nativeDate;
    }
  } catch {
    // Ignore
  }

  console.warn(`⚠️ Could not parse date: "${dateText.substring(0, 100)}"`);
  return null;
}

module.exports = scrapeEventbrite;