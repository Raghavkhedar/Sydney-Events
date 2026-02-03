const router = require("express").Router();
const passport = require("passport");

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    successRedirect: process.env.FRONTEND_URL || "http://localhost:3000/dashboard",
    failureRedirect: (process.env.FRONTEND_URL || "http://localhost:3000") + "/login",
  })
);

router.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect(process.env.FRONTEND_URL || "http://localhost:3000");
  });
});

router.get("/current-user", (req, res) => {
  res.json(req.user || null);
});

module.exports = router;
