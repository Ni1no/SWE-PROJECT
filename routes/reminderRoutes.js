/**
 * REQ-09: Server-side reminder engine — mileage-based urgency for dashboard sync.
 * POST body sends current vehicles + services; server returns computed summaries (no DB copy required).
 */
const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { computeReminderSummaries } = require("../lib/reminderEngine");

const router = express.Router();

router.post("/compute", authMiddleware, (req, res) => {
  const { vehicles, services } = req.body || {};
  if (!Array.isArray(vehicles) || !Array.isArray(services)) {
    return res.status(400).json({
      message: "Expected JSON body { vehicles: [...], services: [...] }",
    });
  }

  const summaries = computeReminderSummaries(vehicles, services);
  res.json({
    summaries,
    computedAt: new Date().toISOString(),
    source: "express-mileage-reminder-engine",
  });
});

module.exports = router;
