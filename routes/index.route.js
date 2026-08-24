// routes/index.route.js
const express = require("express");
const clientRoutes = require("./client/index.route");
const validateObjectId = require("../helpers/validateObjectId");
const errorHandler = require("../middlewares/errorHandler");
const { NotFoundException } = require("../middlewares/errorHandler/exceptions");

const router = express.Router();

// Root route
router.get("/", errorHandler(async (req, res) => {
  res.render("index");
}));
// -------------------------
// Normal API routes (JSON parsing applies)
// -------------------------
router.use("/client", validateObjectId(), clientRoutes);
// Catch-all undefined routes
router.all("*", errorHandler(async (req) => {
  throw new NotFoundException("errors.invalid_request");
}));

module.exports = router;
