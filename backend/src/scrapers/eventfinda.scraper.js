const puppeteer = require("puppeteer");
const Event = require("../models/Event");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

const EVENTFINDA_URL = "https://www.eventfinda.com.au/whatson/sydney";

// Helper function to replace waitForTimeout
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const scrapeEventfinda = async () => {
  let browser;
  
  try {
    console.log("🔍 Starting Eventfinda scraper...");

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
    await page.goto(EVENTFINDA_URL, { 
      waitUntil: "networkidle2",
      timeout: 30000 
    });

    await delay(3000);

    console.log("📜 Scrolling to load more events...");
    await page.evaluate(async () => {
      for (let i = 0; i < 3; i++) {
        window.scrollBy(0, window.innerHeight);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    });

    await delay(2000);

    console.log("🔍 Extracting event data...");

    // Take screenshot for debugging
    await page.screenshot({
      path: "eventfinda-debug.png",
      fullPage: true,
    });
    console.log("📸 Screenshot saved to eventfinda-debug.png");

    // Extract events from Eventfinda
    const events = await page.evaluate(() => {
      const data = [];
      
      // Try multiple selector strategies for Eventfinda
      let eventCards = [];
      
      // Strategy 1: Look for common event card patterns
      const selectors = [
        'article[class*="event"]',
        'div[class*="event"]',
        'li[class*="event"]',
        '.event-item',
        '.event-listing',
        '.event-card',
        '[data-event-id]',
        'a[href*="/event/"]',
        'a[href*="/events/"]',
      ];
      
      for (const selector of selectors) {
        eventCards = Array.from(document.querySelectorAll(selector));
        if (eventCards.length > 0) {
          console.log(`Found ${eventCards.length} events using selector: ${selector}`);
          break;
        }
      }
      
      // Strategy 2: Find all links that look like event links
      if (eventCards.length === 0) {
        const allLinks = Array.from(document.querySelectorAll('a[href*="eventfinda"]'));
        eventCards = allLinks.filter(link => {
          const href = link.href || '';
          return href.includes('/event/') || href.includes('/events/');
        });
        console.log(`Found ${eventCards.length} event links`);
      }
      
      // Strategy 3: Look for any container with event-like content
      if (eventCards.length === 0) {
        const containers = Array.from(document.querySelectorAll('div, article, li'));
        eventCards = containers.filter(container => {
          const text = container.innerText || '';
          const hasDate = /\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(text);
          const hasEventLink = container.querySelector('a[href*="eventfinda"]');
          return hasDate && hasEventLink && text.length > 50 && text.length < 500;
        });
        console.log(`Found ${eventCards.length} event containers`);
      }

      eventCards.forEach((card, index) => {
        try {
          // Get title - try multiple approaches
          let title = '';
          
          // Method 1: Look for heading with link
          const titleSelectors = [
            'h1 a', 'h2 a', 'h3 a', 'h4 a',
            '.event-title a',
            '[class*="title"] a',
            'a[href*="/event/"]',
            'a[href*="/events/"]',
          ];
          
          for (const sel of titleSelectors) {
            const elem = card.querySelector(sel);
            if (elem) {
              title = elem.innerText?.trim() || elem.textContent?.trim() || elem.getAttribute('title') || '';
              if (title && title.length > 5) break;
            }
          }
          
          // Method 2: If card is a link, use its text
          if (!title && card.tagName === 'A') {
            title = card.innerText?.trim() || card.textContent?.trim() || '';
          }
          
          // Method 3: Get first heading text
          if (!title) {
            const heading = card.querySelector('h1, h2, h3, h4, h5, h6');
            if (heading) {
              title = heading.innerText?.trim() || heading.textContent?.trim() || '';
            }
          }

          // Get URL
          let sourceUrl = '';
          const linkElem = card.querySelector('a[href*="/event/"], a[href*="/events/"]') || 
                          (card.tagName === 'A' ? card : null);
          if (linkElem) {
            sourceUrl = linkElem.href || linkElem.getAttribute('href') || '';
            if (sourceUrl && !sourceUrl.startsWith('http')) {
              sourceUrl = 'https://www.eventfinda.com.au' + sourceUrl;
            }
          }

          // Get image
          let imageUrl = '';
          const img = card.querySelector('img');
          if (img) {
            imageUrl = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || 
                      img.getAttribute('data-original') || '';
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = 'https://www.eventfinda.com.au' + imageUrl;
            }
          }

          // Get date/time - be more aggressive
          let dateText = '';
          const dateSelectors = [
            'time[datetime]',
            'time',
            '.event-date',
            '.date',
            '[class*="date"]',
            '[class*="time"]',
            '.event-time',
            '[data-date]',
            '[data-time]',
          ];
          
          for (const sel of dateSelectors) {
            const elem = card.querySelector(sel);
            if (elem) {
              const datetimeAttr = elem.getAttribute('datetime') || elem.getAttribute('data-date') || 
                                  elem.getAttribute('data-time') || '';
              if (datetimeAttr) {
                dateText = datetimeAttr;
                break;
              }
              
              const text = elem.innerText?.trim() || elem.textContent?.trim() || '';
              if (text && text.length < 100 && /\d/.test(text)) {
                dateText = text;
                break;
              }
            }
          }
          
          // Fallback: Look for date patterns in all text
          if (!dateText) {
            const allText = card.innerText || card.textContent || '';
            const datePattern = allText.match(/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}/i);
            if (datePattern) {
              dateText = datePattern[0];
            }
          }

          // Get venue
          let venueName = '';
          const venueSelectors = [
            '.venue-name',
            '.venue',
            '[class*="venue"]',
            '.location',
            '[class*="location"]',
          ];
          
          for (const sel of venueSelectors) {
            const elem = card.querySelector(sel);
            if (elem) {
              venueName = elem.innerText?.trim() || elem.textContent?.trim() || '';
              if (venueName && venueName.length > 2) break;
            }
          }

          // Get description
          let description = '';
          const descSelectors = [
            '.event-description',
            '.description',
            '[class*="description"]',
            '.summary',
            '[class*="summary"]',
            'p',
          ];
          
          for (const sel of descSelectors) {
            const elem = card.querySelector(sel);
            if (elem) {
              const text = elem.innerText?.trim() || elem.textContent?.trim() || '';
              if (text && text.length > 20 && text.length < 500 && text !== title) {
                description = text;
                break;
              }
            }
          }

          // Only add if we have at least title and URL
          if (title && sourceUrl && sourceUrl.includes('eventfinda')) {
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
          console.error(`Error processing card ${index}:`, err);
        }
      });

      return data;
    });

    console.log(`🟢 Found ${events.length} events`);

    if (events.length === 0) {
      console.warn("⚠️ No events extracted");
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
            dateText: eventData.dateText || "",
            venueName: eventData.venueName || "TBD",
            venueAddress: "",
            city: "Sydney",
            description: eventData.description || "",
            category: [],
            imageUrl: eventData.imageUrl || "",
            sourceName: "Eventfinda",
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
          if (eventData.dateText) {
            const newDateTime = parseDateText(eventData.dateText);
            if (newDateTime && (!existingEvent.dateTime || existingEvent.dateTime.getTime() !== newDateTime.getTime())) {
              existingEvent.dateTime = newDateTime;
              existingEvent.dateText = eventData.dateText;
              hasChanges = true;
            } else if (!existingEvent.dateTime && eventData.dateText) {
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

    console.log(`\n✅ Eventfinda scraping completed:`);
    console.log(`   📝 New events: ${newCount}`);
    console.log(`   🔄 Updated events: ${updatedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

  } catch (error) {
    console.error("❌ Eventfinda scraper failed:", error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log("🔒 Browser closed");
    }
  }
};

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
    return null;
  }

  const year = dayjs().year();

  // If it's an ISO date string, parse it directly
  if (dateText.match(/^\d{4}-\d{2}-\d{2}/)) {
    const parsed = dayjs(dateText);
    if (parsed.isValid()) {
      return parsed.toDate();
    }
  }

  // Remove timezone info
  let cleaned = dateText
    .replace(/\s+GMT[+-]\d{1,2}:?\d{0,2}/i, '')
    .replace(/\s+at\s+/i, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Handle "Sat, 14 Feb, 9:00 pm" format
  const commonFormatMatch = cleaned.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
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

  // Try parsing with dayjs formats
  const formats = [
    "D MMM, h:mm A YYYY",
    "D MMM h:mm A YYYY",
    "D MMMM, h:mm A YYYY",
    "D MMMM h:mm A YYYY",
    "MMM D, h:mm A YYYY",
    "MMMM D, h:mm A YYYY",
  ];

  for (const format of formats) {
    const parsed = dayjs(`${cleaned} ${year}`, format);
    if (parsed.isValid()) {
      return parsed.toDate();
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

module.exports = scrapeEventfinda;
