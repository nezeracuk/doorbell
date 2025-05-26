const { Schema, model } = require("mongoose");

const RingSchema = new Schema({
  createdAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["accepted", "blocked"],
    default: "accepted",
  },
});

module.exports = model("Ring", RingSchema);
