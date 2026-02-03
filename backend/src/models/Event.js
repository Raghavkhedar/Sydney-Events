const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    dateTime: {
      type: Date,
    },

    dateText: {
      type: String, // Store raw date text as fallback
    },

    venueName: {
      type: String,
    },

    venueAddress: {
      type: String,
    },

    city: {
      type: String,
      default: "Sydney",
    },

    description: {
      type: String,
    },

    category: [
      {
        type: String,
      },
    ],

    imageUrl: {
      type: String,
    },

    sourceName: {
      type: String,
      required: true,
    },

    sourceUrl: {
      type: String,
      required: true,
      unique: true, 
    },

    lastScraped: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["new", "updated", "inactive", "imported"],
      default: "new",
    },

    importedAt: {
      type: Date,
    },

    importedBy: {
      type: String,
    },

    importNotes: {
      type: String,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt automatically
  }
);

module.exports = mongoose.model("Event", eventSchema);
