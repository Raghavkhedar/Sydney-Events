const mongoose = require("mongoose");

const emailCaptureSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  consent: {
    type: Boolean,
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  capturedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("EmailCapture", emailCaptureSchema);