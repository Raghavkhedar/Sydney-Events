const express = require("express");
const router = express.Router();
const EmailCapture = require("../models/Emailcapture");

router.post("/", async (req, res) => {
  try {
    const { email, consent, eventId } = req.body;

    // Validate
    if (!email || !eventId) {
      return res.status(400).json({ message: "Email and event ID required" });
    }

    if (!consent) {
      return res.status(400).json({ message: "Consent required" });
    }

    // Save email capture
    const emailCapture = await EmailCapture.create({
      email,
      consent,
      eventId,
    });

    res.status(201).json({
      message: "Email captured successfully",
      data: emailCapture,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;