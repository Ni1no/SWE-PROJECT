/**
 * EZ Car Maintenance — Node.js + Express API
 *
 * - Express receives JSON from the mobile app and coordinates persistence.
 * - MongoDB Atlas holds user documents (connection via MONGO_URI / Mongoose).
 * - Passwords: bcrypt hashes only (see routes/authRoutes.js).
 * - Sessions: stateless JWT after login; clients send `Authorization: Bearer <token>`.
 * - Password reset: random token + 1h expiry on the user doc, cleared after reset.
 */
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes");
const reminderRoutes = require("./routes/reminderRoutes");

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Atlas connected"))
  .catch((err) => console.log("MongoDB error:", err));

app.use("/auth", authRoutes);
app.use("/ai", aiRoutes);
app.use("/reminders", reminderRoutes);

app.get("/", (req, res) => {
  res.send("EZ Car Maintenance backend running");
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Express server running on port ${port}`);
});
