const express = require("express");
const router = express.Router();
const Ring = require("../models/Ring");
const { notify } = require("../telegram");
const nightMode = require("../middleware/nightMode");

router.post("/ring", nightMode, async (req, res) => {
  try {
    const ring = await Ring.create({ status: "accepted" });

    const time = new Date(ring.createdAt).toLocaleString("uk-UA");
    notify(`🔔 *Doorbell rung!* \nTime: _${time}_`);

    res.json(ring);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const limit = +req.query.limit || 20;
    const rings = await Ring.find().sort({ createdAt: -1 }).limit(limit);
    res.json(rings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
