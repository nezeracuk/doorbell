const Ring = require("../models/Ring");
const Settings = require("../models/Settings");
const { notify } = require("../telegram");

module.exports = async (req, res, next) => {
  let nightModeEnabled = true;
  let startHour = 22;
  let endHour = 9;
  let manualOverride = false;
  let manualMode = null;

  try {
    const nightModeSetting = await Settings.findOne({ key: "nightMode" });
    if (nightModeSetting) {
      nightModeEnabled = nightModeSetting.value.enabled;
      startHour = nightModeSetting.value.startHour;
      endHour = nightModeSetting.value.endHour;

      manualOverride = nightModeSetting.value.manualOverride === true;
      manualMode = nightModeSetting.value.manualMode;
    }
  } catch (err) {
    console.error("Error fetching night mode settings:", err);
  }

  const hour = new Date().getHours();
  console.log("Current hour:", hour);

  const isNightTime = hour >= startHour || hour < endHour;
  console.log("Is night time:", isNightTime);

  let shouldBlock;

  if (manualOverride && manualMode !== null) {
    shouldBlock = manualMode === true;
    console.log("Using manual override mode:", shouldBlock);
  } else {
    shouldBlock = nightModeEnabled && isNightTime;
    console.log("Using automatic mode:", shouldBlock);
  }

  console.log("Should block:", shouldBlock);

  if (shouldBlock) {
    console.log("BLOCKING REQUEST DUE TO NIGHT MODE");

    await Ring.create({ status: "blocked" });

    notify(`🚫 *Blocked (night mode)* at _${new Date().toLocaleString("uk-UA")}_`, { disable_notification: true });

    return res.status(403).json({
      error: "Нічний режим: дзвінок тимчасово відключено",
    });
  }

  console.log("Night mode check passed, proceeding with request");
  next();
};
