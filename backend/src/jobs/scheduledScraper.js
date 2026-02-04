const cron = require("node-cron");
const scrapeEventbrite = require("../scrapers/eventbrite.scraper");
const scrapeEventfinda = require("../scrapers/eventfinda.scraper");
const scrapeTimeout = require("../scrapers/timeout.scraper");
const Event = require("../models/Event");

// Mark events as inactive when they are clearly past or have gone stale
const markInactiveEvents = async () => {
  try {
    const now = new Date();

    // 1) Events with a past dateTime become inactive (if not already imported)
    const pastResult = await Event.updateMany(
      {
        status: { $ne: "inactive" },
        dateTime: { $lt: now },
      },
      { $set: { status: "inactive" } }
    );

    // 2) Events with no date but very old lastScraped also become inactive
    const staleCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
    const staleResult = await Event.updateMany(
      {
        status: { $ne: "inactive" },
        dateTime: { $exists: false },
        lastScraped: { $lt: staleCutoff },
      },
      { $set: { status: "inactive" } }
    );

    console.log(
      `🕒 Inactive status job: ${pastResult.modifiedCount + staleResult.modifiedCount} events marked as inactive`
    );
  } catch (error) {
    console.error("❌ Inactive status job failed:", error.message);
  }
};

const startScheduledScraping = () => {
  console.log("📅 Scheduled scraping started");

  // Run Eventfinda every 6 hours (better data quality)
  cron.schedule("0 */6 * * *", async () => {
    console.log("\n🔄 Running scheduled Eventfinda scrape...");
    try {
      await scrapeEventfinda();
      console.log("✅ Scheduled Eventfinda scrape completed\n");
    } catch (error) {
      console.error("❌ Scheduled Eventfinda scrape failed:", error.message);
    }
  });

  // Run Eventbrite every 12 hours (backup source)
  cron.schedule("0 */12 * * *", async () => {
    console.log("\n🔄 Running scheduled Eventbrite scrape...");
    try {
      await scrapeEventbrite();
      console.log("✅ Scheduled Eventbrite scrape completed\n");
    } catch (error) {
      console.error("❌ Scheduled Eventbrite scrape failed:", error.message);
    }
  });

  // Run TimeOut Sydney scraper every 12 hours as well
  cron.schedule("30 */12 * * *", async () => {
    console.log("\n🔄 Running scheduled TimeOut Sydney scrape...");
    try {
      await scrapeTimeout();
      console.log("✅ Scheduled TimeOut Sydney scrape completed\n");
    } catch (error) {
      console.error("❌ Scheduled TimeOut Sydney scrape failed:", error.message);
    }
  });

  // Once a day, mark past / stale events as inactive
  cron.schedule("0 3 * * *", async () => {
    console.log("\n🕒 Running inactive status job...");
    await markInactiveEvents();
  });

  console.log("⏰ Eventfinda scraper will run every 6 hours");
  console.log("⏰ Eventbrite scraper will run every 12 hours");
  console.log("⏰ TimeOut Sydney scraper will run every 12 hours (offset 30m)");
  console.log("⏰ Inactive status job will run daily at 03:00");
};

module.exports = startScheduledScraping;