const express = require("express");
const router = express.Router();
const Ring = require("../models/Ring");
const { notify } = require("../telegram");
const nightMode = require("../middleware/nightMode");

router.post(
  "/trigger",
  (req, res, next) => {
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== process.env.ESP_API_KEY) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }
    next();
  },
  nightMode,
  async (req, res) => {
    try {
      const ring = await Ring.create({ status: "accepted" });

      const time = new Date(ring.createdAt).toLocaleString("uk-UA");
      notify(`🔔 *Doorbell rung!* \nTime: _${time}_`);

      return res.json({ status: "success" });
    } catch (err) {
      console.error("ESP8266 trigger error:", err);
      res.status(500).json({ status: "error", message: err.message });
    }
  }
);

router.get("/night-mode", async (req, res) => {
  try {
    const Settings = require("../models/Settings");
    const nightModeSetting = await Settings.findOne({ key: "nightMode" });

    let nightModeEnabled = true;
    let startHour = 22;
    let endHour = 9;
    let manualOverride = false;
    let manualMode = null;

    if (nightModeSetting) {
      nightModeEnabled = nightModeSetting.value.enabled;
      startHour = nightModeSetting.value.startHour;
      endHour = nightModeSetting.value.endHour;
      manualOverride = nightModeSetting.value.manualOverride === true;
      manualMode = nightModeSetting.value.manualMode;
    }

    const hour = new Date().getHours();
    const isNightTime = hour >= startHour || hour < endHour;
    const active = manualOverride ? manualMode : nightModeEnabled && isNightTime;

    return res.json({
      active,
      nightModeEnabled,
      isNightTime,
      manualOverride,
      manualMode,
      currentHour: hour,
    });
  } catch (err) {
    console.error("ESP8266 night mode check error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

module.exports = router;
