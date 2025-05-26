const { Schema, model } = require("mongoose");

const DeviceSchema = new Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    default: "ESP8266 Doorbell",
  },
  type: {
    type: String,
    enum: ["doorbell", "camera", "sensor"],
    default: "doorbell",
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  ipAddress: String,
  firmwareVersion: String,
  status: {
    type: String,
    enum: ["online", "offline"],
    default: "online",
  },
  batteryLevel: Number,
});

module.exports = model("Device", DeviceSchema);
