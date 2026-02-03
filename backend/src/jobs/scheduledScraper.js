const cron = require("node-cron");
const scrapeEventbrite = require("../scrapers/eventbrite.scraper");
const scrapeEventfinda = require("../scrapers/eventfinda.scraper");

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

  console.log("⏰ Eventfinda scraper will run every 6 hours");
  console.log("⏰ Eventbrite scraper will run every 12 hours");
};

module.exports = startScheduledScraping;