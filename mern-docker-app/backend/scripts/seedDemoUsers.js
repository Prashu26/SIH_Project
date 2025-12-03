const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/User");

const seedDemoUsers = async () => {
  try {
    console.log("🌱 Starting demo user seeding...");

    // Check if demo users already exist
    const existingLearner = await User.findOne({
      email: "learner@example.com",
    });
    const existingInstitute = await User.findOne({
      email: "institute@example.com",
    });
    const existingAdmin = await User.findOne({ email: "admin@example.com" });

    if (existingLearner && existingInstitute && existingAdmin) {
      console.log("✅ Demo users already exist, skipping seeding");
      return;
    }

    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create demo learner
    if (!existingLearner) {
      const learner = new User({
        name: "Demo Learner",
        email: "learner@example.com",
        password: hashedPassword,
        role: "learner",
        learnerProfile: {
          learnerId: "LRN-DEMO-001",
          courses: [],
        },
      });
      await learner.save();
      console.log("✅ Created demo learner: learner@example.com");
    }

    // Create demo institution
    if (!existingInstitute) {
      const institute = new User({
        name: "Demo Institution",
        email: "institute@example.com",
        password: hashedPassword,
        role: "institute",
        instituteProfile: {
          registrationId: "INST-DEMO-001",
          verificationKey: uuidv4(),
        },
      });
      // Mark demo institution as pending approval so it appears in admin console
      institute.isApproved = true;
      await institute.save();
      console.log("✅ Created demo institution: institute@example.com");
    }

    // Create demo admin
    if (!existingAdmin) {
      const admin = new User({
        name: "Demo Admin",
        email: "admin@example.com",
        password: hashedPassword,
        role: "admin",
      });
      await admin.save();
      console.log("✅ Created demo admin: admin@example.com");
    }

    console.log("🎉 Demo user seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding demo users:", error);
    throw error;
  }
};

module.exports = { seedDemoUsers };
