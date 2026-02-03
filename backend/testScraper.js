const dotenv = require("dotenv");
dotenv.config();

const connectDB = require("./src/config/db");
const scrapeEventbrite = require("./src/scrapers/eventbrite.scraper");
const scrapeEventfinda = require("./src/scrapers/eventfinda.scraper");
const scrapeTimeout = require("./src/scrapers/timeout.scraper");

// Get scraper type from command line argument (default: timeout)
const scraperType = process.argv[2] || "timeout";

const run = async () => {
  try {
    console.log(`🚀 Starting ${scraperType} scraper test...\n`);
    
    // Connect to database
    await connectDB();
    console.log("✅ Database connected\n");
    
    // Run appropriate scraper
    if (scraperType === "timeout") {
      await scrapeTimeout();
    } else if (scraperType === "eventfinda") {
      await scrapeEventfinda();
    } else if (scraperType === "eventbrite") {
      await scrapeEventbrite();
    } else {
      console.error(`❌ Unknown scraper type: ${scraperType}`);
      console.log("Available scrapers: timeout, eventfinda, eventbrite");
      process.exit(1);
    }
    
    console.log(`\n✅ ${scraperType} scraper test completed successfully!`);
    process.exit(0); // Exit with success code
    
  } catch (error) {
    console.error(`\n❌ ${scraperType} scraper test failed:`);
    console.error(error);
    process.exit(1); // Exit with error code
  }
};

run();