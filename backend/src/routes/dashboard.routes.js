const router = require("express").Router();
const Event = require("../models/Event");
const isAuth = require("../middleware/isAuth");

// Admin dashboard: list events with filters
router.get("/events", isAuth, async (req, res) => {
  try {
    const {
      city,
      search,
      status,
      startDate,
      endDate,
    } = req.query;

    const query = {};

    // City filter (default: Sydney, but allow multi-city in future)
    if (city) {
      query.city = city;
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Keyword search on title / venue / description
    if (search) {
      const regex = { $regex: search, $options: "i" };
      query.$or = [
        { title: regex },
        { description: regex },
        { venueName: regex },
      ];
    }

    // Date range filter on dateTime
    if (startDate || endDate) {
      query.dateTime = {};
      if (startDate) {
        query.dateTime.$gte = new Date(startDate);
      }
      if (endDate) {
        // include the whole end day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.dateTime.$lte = end;
      }
    }

    const events = await Event.find(query)
      .sort({ dateTime: 1, createdAt: -1 })
      .lean();

    res.json(events);
  } catch (error) {
    console.error("Dashboard events error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Import to platform action
router.patch("/events/:id/import", isAuth, async (req, res) => {
  try {
    const { notes } = req.body;

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      {
        status: "imported",
        importedAt: new Date(),
        importedBy: req.user.email,
        importNotes: notes || "",
      },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event);
  } catch (error) {
    console.error("Import event error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
