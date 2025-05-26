const express = require("express");
const router = express.Router();
const Ring = require("../models/Ring");

// GET /api/stats/missed?days=7
router.get("/missed", async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const since = new Date(Date.now() - days * 24 * 3600e3);

  const hourly = await Ring.aggregate([
    { $match: { status: "blocked", createdAt: { $gte: since } } },
    {
      $group: {
        _id: { hour: { $hour: { date: "$createdAt", timezone: "Europe/Kyiv" } } },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.hour": 1 } },
  ]);

  const daily = await Ring.aggregate([
    { $match: { status: "blocked", createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          year: { $year: { date: "$createdAt", timezone: "Europe/Kyiv" } },
          month: { $month: { date: "$createdAt", timezone: "Europe/Kyiv" } },
          day: { $dayOfMonth: { date: "$createdAt", timezone: "Europe/Kyiv" } },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);

  res.json({ hourly, daily });
});

module.exports = router;
