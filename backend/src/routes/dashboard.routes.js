const router = require("express").Router();
const Event = require("../models/Event");
const isAuth = require("../middleware/isAuth");

router.get("/events", isAuth, async (req, res) => {
  const events = await Event.find().sort({ createdAt: -1 });
  res.json(events);
});

router.patch("/events/:id/import", isAuth, async (req, res) => {
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

  res.json(event);
});

module.exports = router;
