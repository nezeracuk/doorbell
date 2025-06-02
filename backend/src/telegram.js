const axios = require("axios");
require("dotenv").config();
const Ring = require("../src/models/Ring");
const Settings = require("../src/models/Settings");

const token = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function telegramApiRequest(method, data = {}) {
  try {
    const API_IP = "149.154.167.220";
    const url = `https://${API_IP}/bot${token}/${method}`;
    console.log(`Sending request to: ${method} using direct IP`);

    const response = await axios({
      method: "post",
      url: url,
      data: data,
      headers: {
        "Content-Type": "application/json",
        Host: "api.telegram.org",
      },
      timeout: 10000,
    });

    return response.data;
  } catch (err) {
    console.error(`Telegram API error (${method}):`, err.message);
    return null;
  }
}

async function sendMessage(chatId, text, options = {}) {
  const data = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
    ...options,
  };

  const result = await telegramApiRequest("sendMessage", data);
  if (result && result.ok) {
    console.log("Message sent successfully via direct API");
    return result.result;
  }
  return null;
}

async function notify(text, options = {}) {
  if (!token || !CHAT_ID) {
    console.log("Cannot send notification: missing token or CHAT_ID");
    return;
  }

  return sendMessage(CHAT_ID, text, options);
}

async function setupWebhook(url) {
  const result = await telegramApiRequest("setWebhook", {
    url: `${url}/api/telegram-webhook`,
    allowed_updates: ["message", "callback_query"],
  });

  if (result && result.ok) {
    console.log("Webhook set successfully:", result.description);
    return true;
  }

  console.error("Failed to set webhook:", result);
  return false;
}

async function handleUpdate(update) {
  if (!update) return;

  try {
    if (update.message && update.message.text) {
      const msg = update.message;
      const text = msg.text;

      if (text.startsWith("/last")) {
        await handleLastCommand(msg);
      } else if (text.startsWith("/missed")) {
        await handleMissedCommand(msg);
      } else if (text.startsWith("/mode")) {
        await handleModeCommand(msg);
      } else if (text.startsWith("/auto")) {
        await handleAutoCommand(msg);
      } else if (text.startsWith("/stats")) {
        await handleStatsCommand(msg);
      } else if (text.startsWith("/analysis")) {
        await handleAnalysisCommand(msg);
      }
    }

    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }
  } catch (err) {
    console.error("Error handling telegram update:", err);
  }
}

async function handleLastCommand(msg) {
  try {
    const lastRing = await Ring.findOne().sort({ createdAt: -1 });

    if (!lastRing) {
      return sendMessage(msg.chat.id, "No doorbell rings found in database.");
    }

    const time = new Date(lastRing.createdAt).toLocaleString("uk-UA");
    const status = lastRing.status === "accepted" ? "✅ Accepted" : "🚫 Blocked";

    await sendMessage(msg.chat.id, `*Last Ring*\nStatus: ${status}\nTime: _${time}_`);
  } catch (err) {
    console.error("Error fetching last ring:", err);
    await sendMessage(msg.chat.id, "Error fetching last ring data");
  }
}

async function handleMissedCommand(msg) {
  try {
    const days = 7;
    const since = new Date(Date.now() - days * 24 * 3600e3);
    const blockedRings = await Ring.find({
      status: "blocked",
      createdAt: { $gte: since },
    }).sort({ createdAt: -1 });

    if (blockedRings.length === 0) {
      return sendMessage(msg.chat.id, `No blocked rings in the last ${days} days.`);
    }

    let text = `🚫 *Missed rings in last ${days} days*\n\n`;
    blockedRings.forEach((ring) => {
      text += `• ${new Date(ring.createdAt).toLocaleString("uk-UA")}\n`;
    });

    text += `\nTotal: ${blockedRings.length} blocked rings`;

    await sendMessage(msg.chat.id, text);
  } catch (err) {
    console.error("Error fetching missed rings:", err);
    await sendMessage(msg.chat.id, "Error fetching missed rings data");
  }
}

async function handleModeCommand(msg) {
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

    await sendMessage(
      msg.chat.id,
      `*Night Mode Status*\nCurrently: ${statusText}\nSchedule: ${startHour}:00-${endHour}:00`,
      { reply_markup: JSON.stringify(keyboard) }
    );
  } catch (err) {
    console.error("Error handling mode command:", err);
    await sendMessage(msg.chat.id, "Error retrieving night mode status");
  }
}

async function handleAutoCommand(msg) {
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

    await sendMessage(msg.chat.id, "Night mode has been reset to automatic schedule-based operation.");
  } catch (err) {
    console.error("Error resetting to auto mode:", err);
    await sendMessage(msg.chat.id, "Error resetting night mode");
  }
}

async function handleStatsCommand(msg) {
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

    await sendMessage(msg.chat.id, text);
  } catch (err) {
    console.error("Error fetching statistics:", err);
    await sendMessage(msg.chat.id, "Error fetching statistics data");
  }
}

async function handleAnalysisCommand(msg) {
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

    await sendMessage(msg.chat.id, text);
  } catch (err) {
    console.error("Error generating analysis:", err);
    await sendMessage(msg.chat.id, "Error generating call analysis");
  }
}

async function handleCallbackQuery(query) {
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

      await telegramApiRequest("answerCallbackQuery", {
        callback_query_id: query.id,
        text: newState ? "Night mode enabled!" : "Night mode disabled!",
      });

      await sendMessage(
        query.message.chat.id,
        `Night mode has been manually ${newState ? "enabled" : "disabled"}. Use /mode to see status.`
      );
    } catch (err) {
      console.error("Error toggling night mode:", err);
      await telegramApiRequest("answerCallbackQuery", {
        callback_query_id: query.id,
        text: "Error updating settings",
      });
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

      await telegramApiRequest("answerCallbackQuery", {
        callback_query_id: query.id,
        text: "Reset to automatic schedule mode!",
      });

      await sendMessage(query.message.chat.id, "Night mode reset to automatic schedule. Use /mode to see status.");
    } catch (err) {
      console.error("Error resetting mode:", err);
      await telegramApiRequest("answerCallbackQuery", {
        callback_query_id: query.id,
        text: "Error updating settings",
      });
    }
  }
}

async function checkConnection() {
  try {
    const result = await telegramApiRequest("getMe");
    if (result && result.ok) {
      console.log("✅ Successfully connected to Telegram API via direct method");
      console.log(`Bot: @${result.result.username} (${result.result.id})`);
      return true;
    } else {
      console.error("❌ Failed to connect to Telegram API:", result);
      return false;
    }
  } catch (err) {
    console.error("❌ Connection test failed:", err.message);
    return false;
  }
}

checkConnection();

async function startPolling() {
  console.log("Starting Telegram bot polling...");
  let offset = 0;

  const poll = async () => {
    try {
      const updates = await telegramApiRequest("getUpdates", {
        offset,
        timeout: 30,
      });

      if (updates && updates.ok && updates.result.length > 0) {
        console.log(`Received ${updates.result.length} updates`);

        for (const update of updates.result) {
          await handleUpdate(update);
          offset = update.update_id + 1;
        }
      }
    } catch (error) {
      console.error("Error in polling:", error);
    }

    setTimeout(poll, 1000);
  };

  poll();
  return true;
}

module.exports = {
  notify,
  sendMessage,
  telegramApiRequest,
  handleUpdate,
  setupWebhook,
  startPolling,
};
