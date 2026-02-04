const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require("cors");
const connectDB = require('./src/config/db');
const startScheduledScraping = require("./src/jobs/scheduledScraper");
const session = require("express-session");
const passport = require("passport");
require("./src/auth/passport");


const app = express();

//Middlewares
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',') 
  : ["https://sydney-events-frontend.onrender.com/"];

app.use(
  cors({
    // origin: allowedOrigins, // Allow frontend URLs (comma-separated for multiple)
    origin: "https://sydney-events-frontend.onrender.com",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // 🔥 REQUIRED for cookies
  })
);
app.use(express.json());
//OAuth session handling
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true in production (https)
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

//Connecting MONGODB
connectDB();

// Start scheduled scraping
startScheduledScraping();

//Routes
app.get('/', function(req, res) {
    res.send('Chal rha h ');
})

// Routes
app.use("/api/events", require("./src/routes/events"));
app.use("/api/email-capture", require("./src/routes/emailcapture")); // Add this
app.use("/auth", require("./src/routes/auth.routes"));
app.use("/api/dashboard", require("./src/routes/dashboard.routes"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, function(){
    console.log(`Server is running on port ${PORT}`);
})