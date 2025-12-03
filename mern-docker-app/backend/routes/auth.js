const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const User = require("../models/User");

const router = express.Router();

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, __v, ...rest } = user.toObject({
    getters: true,
    virtuals: false,
  });
  if (rest.role) {
    rest.role = rest.role.toLowerCase();
  }
  return rest;
};

// Register user (Learner, Institute, Institution, Admin)
router.post("/register", async (req, res) => {
  try {
    let normalizedRole = (req.body.role || "").toLowerCase();
    if (
      !["learner", "institute", "institution", "admin"].includes(normalizedRole)
    ) {
      return res.status(400).json({ message: "Invalid role supplied." });
    }

    // Assign 'institution' role instead of 'institute' during registration
    if (normalizedRole === "institute") {
      normalizedRole = "institution";
    }

    const email = (req.body.email || "").toLowerCase().trim();
    const name = (req.body.name || "").trim();
    const password = req.body.password;

    if (!email || !name || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required." });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already in use." });
    }

    if (normalizedRole === "admin") {
      const providedSecret = req.body.adminSecret;
      const adminSecret =
        process.env.ADMIN_REG_SECRET || "moducert-admin-bootstrap";
      if (providedSecret !== adminSecret) {
        return res
          .status(403)
          .json({ message: "Invalid admin registration secret." });
      }
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashed,
      role: normalizedRole,
    });

    if (normalizedRole === "learner") {
      const learnerId = (req.body.learnerId || "").trim();
      if (!learnerId) {
        return res.status(400).json({ message: "Learner ID is required." });
      }

      const existingLearnerId = await User.findOne({
        "learnerProfile.learnerId": learnerId,
      });
      if (existingLearnerId) {
        return res.status(400).json({ message: "Learner ID already in use." });
      }

      user.learnerProfile = {
        learnerId,
        courses: Array.isArray(req.body.courses) ? req.body.courses : [],
      };
    }

    if (["institute", "institution"].includes(normalizedRole)) {
      const requestedRegistrationId = (
        req.body.registrationId || uuidv4()
      ).trim();
      const existingRegistration = await User.findOne({
        "instituteProfile.registrationId": requestedRegistrationId,
      });
      if (existingRegistration) {
        return res
          .status(400)
          .json({ message: "Registration ID already in use." });
      }

      user.instituteProfile = {
        registrationId: requestedRegistrationId,
        verificationKey: uuidv4(),
      };
      // New institute/institution registrations require admin approval
      // before they can login. Mark as not approved by default.
      user.isApproved = false;
    }

    await user.save();

    return res.json({
      message: "Registration successful",
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Missing fields" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Invalid credentials" });

    // Prevent unapproved institutes from logging in
    const userRole = (user.role || "").toLowerCase();
    if (
      ["institution", "institute"].includes(userRole) &&
      user.isApproved === false
    ) {
      return res
        .status(403)
        .json({
          message:
            "Account pending admin approval. Please wait for administrator approval.",
        });
    }

    const role = (user.role || "").toLowerCase();
    const payload = { id: user._id, role, email: user.email };
    const secret = process.env.JWT_SECRET || "supersecret";
    const token = jwt.sign(payload, secret, { expiresIn: "7d" });
    res.json({ token, role, user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Current user profile shortcut
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "supersecret";
    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Invalid token" });
  }
});

module.exports = router;
