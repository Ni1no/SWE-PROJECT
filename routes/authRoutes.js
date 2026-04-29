/**
 * Auth routes — matches the stack described for demos:
 * - Express handles HTTP between the app and MongoDB Atlas (via Mongoose).
 * - Passwords are never stored in plain text: bcrypt hashes on register / reset.
 * - Login returns a JWT the client sends on protected routes (`Authorization: Bearer …`).
 * - Password reset: cryptographically random token, stored with a 1-hour expiry, cleared after use.
 */
const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

/** Reset links are valid for one hour (stored as `resetPasswordExpires`). */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Who am I? Validates JWT and returns public profile (no password hash). */
router.get("/me", authMiddleware, (req, res) => {
  res.json({
    user: {
      name: req.user.name,
      email: req.user.email,
    },
  });
});

router.patch("/profile", authMiddleware, async (req, res) => {
  try {
    const rawName = req.body?.name;
    const rawEmail = req.body?.email;
    const name = String(rawName || "").trim();
    const email = String(rawEmail || "")
      .trim()
      .toLowerCase();

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const emailTaken = await User.findOne({
      email,
      _id: { $ne: req.user._id },
    }).select("_id");
    if (emailTaken) {
      return res.status(400).json({ message: "Email is already in use" });
    }

    req.user.name = name;
    req.user.email = email;
    await req.user.save();

    const token = jwt.sign(
      { userId: req.user._id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Profile updated",
      token,
      user: {
        name: req.user.name,
        email: req.user.email,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.delete("/profile", authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    return res.json({ message: "Profile deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: { name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.trim() });
    if (!user) {
      return res.json({
        message:
          "If that email is registered, you will receive reset instructions.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = rawToken;
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const base = {
      message:
        "If that email is registered, you will receive reset instructions.",
      expiresAt: user.resetPasswordExpires,
    };

    // In production, email a link only — never return the raw token in JSON.
    if (process.env.NODE_ENV === "production") {
      return res.json(base);
    }

    return res.json({
      ...base,
      resetToken: rawToken,
      devLocalReset: true,
      note:
        "Development only: resetToken is included so you can demo the flow without email.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token and new password are required" });
    }
    if (String(newPassword).length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({
      resetPasswordToken: String(token),
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset link" });
    }

    user.password = await bcrypt.hash(String(newPassword), 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({
      message: "Password updated. You can sign in with your new password.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
