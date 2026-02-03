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
app.use(
  cors({
    origin: ["http://localhost:3000"], // Allow both frontend ports
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
      secure: false, // true ONLY in production (https)
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

app.listen(5000, function(){
    console.log('Server is running on port 5000');
})