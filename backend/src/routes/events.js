const express = require("express");
const router = express.Router();
const Event = require("../models/Event");

// GET all events (public)
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;

    const query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { venueName: { $regex: search, $options: "i" } },
      ];
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Only show active events (not inactive)
    if (!status) {
      query.status = { $ne: "inactive" };
    }

    const events = await Event.find(query)
      .sort({ dateTime: 1 }) // Sort by date ascending
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Event.countDocuments(query);

    // Ensure dates are properly serialized
    const formattedEvents = events.map(event => ({
      ...event,
      dateTime: event.dateTime ? new Date(event.dateTime).toISOString() : null,
      dateText: event.dateText || null, // Include dateText as fallback
      createdAt: event.createdAt ? new Date(event.createdAt).toISOString() : null,
      updatedAt: event.updatedAt ? new Date(event.updatedAt).toISOString() : null,
    }));

    res.json({
      events: formattedEvents,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalEvents: count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET single event
router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Ensure dates are properly serialized
    const formattedEvent = {
      ...event,
      dateTime: event.dateTime ? new Date(event.dateTime).toISOString() : null,
      dateText: event.dateText || null, // Include dateText as fallback
      createdAt: event.createdAt ? new Date(event.createdAt).toISOString() : null,
      updatedAt: event.updatedAt ? new Date(event.updatedAt).toISOString() : null,
    };

    res.json(formattedEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;