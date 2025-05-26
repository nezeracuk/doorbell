const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
require("dotenv").config();
const Ring = require("../src/models/Ring");
const Settings = require("../src/models/Settings");

const token = process.env.TELEGRAM_BOT_TOKEN;
let bot;
let isPollingEnabled = false;

function initBot() {
  if (!token) {
    console.warn("Warning: TELEGRAM_BOT_TOKEN not found in .env file");
    return false;
  }

  try {
    bot = new TelegramBot(token, { polling: false });
    return true;
  } catch (err) {
    console.error("Error initializing Telegram bot:", err);
    return false;
  }
}

const isBotInitialized = initBot();
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function startPolling() {
  if (!isBotInitialized) return;

  try {
    bot.startPolling({ restart: false });
    isPollingEnabled = true;

    bot.on("polling_error", (error) => {
      console.error(`Polling error: ${error.code}. Stopping polling to prevent spam.`);
      if (isPollingEnabled) {
        bot.stopPolling();
        isPollingEnabled = false;
      }
    });

    setupCommandHandlers();
  } catch (err) {
    console.error("Failed to start polling:", err);
  }
}

function setupCommandHandlers() {
  bot.onText(/\/last/, async (msg) => {
    try {
      const lastRing = await Ring.findOne().sort({ createdAt: -1 });

      if (!lastRing) {
        return bot.sendMessage(msg.chat.id, "No doorbell rings found in database.");
      }

      const time = new Date(lastRing.createdAt).toLocaleString("uk-UA");
      const status = lastRing.status === "accepted" ? "✅ Accepted" : "🚫 Blocked";

      await bot.sendMessage(msg.chat.id, `*Last Ring*\nStatus: ${status}\nTime: _${time}_`, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Error fetching last ring:", err);
      await bot.sendMessage(msg.chat.id, "Error fetching last ring data");
    }
  });

  bot.onText(/\/missed/, async (msg) => {
    try {
      const days = 7;
      const since = new Date(Date.now() - days * 24 * 3600e3);
      const blockedRings = await Ring.find({
        status: "blocked",
        createdAt: { $gte: since },
      }).sort({ createdAt: -1 });

      if (blockedRings.length === 0) {
        return bot.sendMessage(msg.chat.id, `No blocked rings in the last ${days} days.`);
      }

      let text = `🚫 *Missed rings in last ${days} days*\n\n`;
      blockedRings.forEach((ring) => {
        text += `• ${new Date(ring.createdAt).toLocaleString("uk-UA")}\n`;
      });

      text += `\nTotal: ${blockedRings.length} blocked rings`;

      await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Error fetching missed rings:", err);
      await bot.sendMessage(msg.chat.id, "Error fetching missed rings data");
    }
  });

  bot.onText(/\/mode/, async (msg) => {
    try {
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

      const isNightTime = new Date().getHours() >= startHour || new Date().getHours() < endHour;
      const active = manualOverride ? manualMode : nightModeEnabled && isNightTime;

      const keyboard = {
        inline_keyboard: [
          [{ text: "Toggle night mode", callback_data: "toggle_night_mode" }],
          [{ text: "Reset to auto mode", callback_data: "reset_to_auto" }],
        ],
      };

      let statusText = active ? "🌙 Enabled" : "☀️ Disabled";
      if (manualOverride) {
        statusText += " (manual override)";
      }

      await bot.sendMessage(
        msg.chat.id,
        `*Night Mode Status*\nCurrently: ${statusText}\nSchedule: ${startHour}:00-${endHour}:00`,
        {
          parse_mode: "Markdown",
          reply_markup: keyboard,
        }
      );
    } catch (err) {
      console.error("Error handling mode command:", err);
      await bot.sendMessage(msg.chat.id, "Error retrieving night mode status");
    }
  });

  bot.onText(/\/auto/, async (msg) => {
    try {
      const nightModeSetting = await Settings.findOne({ key: "nightMode" });

      if (!nightModeSetting) {
        await Settings.create({
          key: "nightMode",
          value: {
            enabled: true,
            startHour: 22,
            endHour: 9,
            manualOverride: false,
          },
        });
      } else {
        await Settings.updateOne(
          { key: "nightMode" },
          {
            $set: {
              "value.manualOverride": false,
              updatedAt: new Date(),
            },
          }
        );
      }

      await bot.sendMessage(msg.chat.id, "Night mode has been reset to automatic schedule-based operation.", {
        parse_mode: "Markdown",
      });
    } catch (err) {
      console.error("Error resetting to auto mode:", err);
      await bot.sendMessage(msg.chat.id, "Error resetting night mode");
    }
  });

  bot.on("callback_query", async (query) => {
    if (query.data === "toggle_night_mode") {
      try {
        let nightModeSetting = await Settings.findOne({ key: "nightMode" });
        let newState;

        if (!nightModeSetting) {
          nightModeSetting = await Settings.create({
            key: "nightMode",
            value: {
              enabled: true,
              startHour: 22,
              endHour: 9,
              manualOverride: true,
              manualMode: false,
            },
          });
          newState = false;
        } else {
          let currentState = nightModeSetting.value.manualMode;
          if (nightModeSetting.value.manualOverride !== true) {
            const hour = new Date().getHours();
            const isNightTime = hour >= nightModeSetting.value.startHour || hour < nightModeSetting.value.endHour;
            currentState = nightModeSetting.value.enabled && isNightTime;
          }

          newState = !currentState;

          await Settings.updateOne(
            { key: "nightMode" },
            {
              $set: {
                "value.manualOverride": true,
                "value.manualMode": newState,
                updatedAt: new Date(),
              },
            }
          );
        }

        await bot.answerCallbackQuery(query.id, {
          text: newState ? "Night mode enabled!" : "Night mode disabled!",
        });

        await bot.sendMessage(
          query.message.chat.id,
          `Night mode has been manually ${newState ? "enabled" : "disabled"}. Use /mode to see status.`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("Error toggling night mode:", err);
        await bot.answerCallbackQuery(query.id, { text: "Error updating settings" });
      }
    } else if (query.data === "reset_to_auto") {
      try {
        await Settings.updateOne(
          { key: "nightMode" },
          {
            $set: {
              "value.manualOverride": false,
              updatedAt: new Date(),
            },
          }
        );

        await bot.answerCallbackQuery(query.id, {
          text: "Reset to automatic schedule mode!",
        });

        await bot.sendMessage(
          query.message.chat.id,
          "Night mode reset to automatic schedule. Use /mode to see status.",
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("Error resetting mode:", err);
        await bot.answerCallbackQuery(query.id, { text: "Error updating settings" });
      }
    }
  });

  bot.onText(/\/stats/, async (msg) => {
    try {
      const days = 7;
      const since = new Date(Date.now() - days * 24 * 3600e3);

      const totalRings = await Ring.countDocuments({
        createdAt: { $gte: since },
      });

      const acceptedRings = await Ring.countDocuments({
        status: "accepted",
        createdAt: { $gte: since },
      });

      const blockedRings = await Ring.countDocuments({
        status: "blocked",
        createdAt: { $gte: since },
      });

      const hourlyStats = await Ring.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              hour: { $hour: { date: "$createdAt", timezone: "Europe/Kyiv" } },
              status: "$status",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.hour": 1 } },
      ]);

      const hourlyMap = {};
      hourlyStats.forEach((stat) => {
        const hour = stat._id.hour;
        const status = stat._id.status;

        if (!hourlyMap[hour]) {
          hourlyMap[hour] = { accepted: 0, blocked: 0 };
        }

        hourlyMap[hour][status] = stat.count;
      });

      let peakHour = -1;
      let peakCount = 0;

      Object.entries(hourlyMap).forEach(([hour, counts]) => {
        const total = counts.accepted + counts.blocked;
        if (total > peakCount) {
          peakCount = total;
          peakHour = hour;
        }
      });

      let missedPeakHour = -1;
      let missedPeakCount = 0;

      Object.entries(hourlyMap).forEach(([hour, counts]) => {
        if (counts.blocked > missedPeakCount) {
          missedPeakCount = counts.blocked;
          missedPeakHour = hour;
        }
      });

      let text = `📊 *Statistics for last ${days} days*\n\n`;
      text += `Total rings: ${totalRings}\n`;
      text += `Accepted: ${acceptedRings}\n`;
      text += `Blocked: ${blockedRings}\n\n`;

      if (peakHour !== -1) {
        text += `🔔 Most activity: ${peakHour}:00-${(parseInt(peakHour) + 1) % 24}:00 (${peakCount} rings)\n`;
      }

      if (missedPeakHour !== -1) {
        text += `🚫 Most missed: ${missedPeakHour}:00-${
          (parseInt(missedPeakHour) + 1) % 24
        }:00 (${missedPeakCount} blocked)\n\n`;
      }

      if (Object.keys(hourlyMap).length > 0) {
        text += `*Hourly distribution:*\n`;

        Object.entries(hourlyMap)
          .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
          .forEach(([hour, counts]) => {
            const total = counts.accepted + counts.blocked;
            if (total > 0) {
              const bar = total > 1 ? "█".repeat(Math.min(5, total)) : "▏";
              text += `${hour.padStart(2, "0")}:00 ${bar} ${counts.accepted}✅ ${counts.blocked}🚫\n`;
            }
          });
      }

      await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Error fetching statistics:", err);
      await bot.sendMessage(msg.chat.id, "Error fetching statistics data");
    }
  });

  bot.onText(/\/analysis/, async (msg) => {
    try {
      const days = 14;
      const since = new Date(Date.now() - days * 24 * 3600e3);

      const dailyStats = await Ring.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              dayOfWeek: { $dayOfWeek: { date: "$createdAt", timezone: "Europe/Kyiv" } },
              status: "$status",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.dayOfWeek": 1 } },
      ]);

      const dayNames = ["", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dailyMap = {};

      dailyStats.forEach((stat) => {
        const day = stat._id.dayOfWeek;
        const status = stat._id.status;

        if (!dailyMap[day]) {
          dailyMap[day] = { accepted: 0, blocked: 0, name: dayNames[day] };
        }

        dailyMap[day][status] = stat.count;
      });

      const hourlyMissed = await Ring.aggregate([
        { $match: { createdAt: { $gte: since }, status: "blocked" } },
        {
          $group: {
            _id: { hour: { $hour: { date: "$createdAt", timezone: "Europe/Kyiv" } } },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 3 },
      ]);

      let text = `🔍 *Missed Calls Analysis*\n\n`;
      text += `*When you might be missing calls:*\n\n`;

      if (hourlyMissed.length > 0) {
        text += "*Top hours with missed calls:*\n";
        hourlyMissed.forEach((item) => {
          text += `• ${item._id.hour}:00-${(item._id.hour + 1) % 24}:00: ${item.count} missed calls\n`;
        });
        text += "\n";
      }

      text += "*Day of week pattern:*\n";
      Object.values(dailyMap)
        .sort((a, b) => b.blocked / (b.accepted + b.blocked || 1) - a.blocked / (a.accepted + a.blocked || 1))
        .forEach((day) => {
          const total = day.accepted + day.blocked;
          if (total > 0) {
            const missedPercentage = Math.round((day.blocked / total) * 100);
            text += `• ${day.name}: ${day.blocked}/${total} missed (${missedPercentage}%)\n`;
          }
        });

      await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Error generating analysis:", err);
      await bot.sendMessage(msg.chat.id, "Error generating call analysis");
    }
  });
}

async function notify(text, options = {}) {
  if (!isBotInitialized || !CHAT_ID) return;

  try {
    const messageOptions = {
      parse_mode: "Markdown",
      ...options,
    };

    await bot.sendMessage(CHAT_ID, text, messageOptions);
  } catch (err) {
    console.error("Telegram error:", err);
  }
}

if (isBotInitialized) {
  startPolling();
}

module.exports = { notify };
