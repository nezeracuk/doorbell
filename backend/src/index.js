require("dotenv").config();
const express = require("express");
const cors = require("cors");
require("./db");
const path = require("path");
const Ring = require("../src/models/Ring");
const rings = require("./routes/rings");
const nightMode = require("./middleware/nightMode");
const stats = require("./routes/stats");
const esp = require("./routes/esp");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/ring-test", nightMode, async (req, res) => {
  const ring = await Ring.create({ status: "accepted" });
  res.json(ring);
});

app.use("/api", rings);
app.use("/api/stats", stats);
app.use("/api/esp", esp);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../../frontend/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/build/index.html"));
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
