const bcrypt = require('bcryptjs');
const User = require('../models/User');

const learnersFromTemplate = [
  {
    name: 'Emma Learner',
    email: 'emma.learner@example.com',
    learnerId: 'EMMA-003'
  },
  {
    name: 'Liam Learner',
    email: 'liam.learner@example.com',
    learnerId: 'LIAM-004'
  },
  {
    name: 'Sophia Learner',
    email: 'sophia.learner@example.com',
    learnerId: 'SOPH-005'
  },
  {
    name: 'Noah Learner',
    email: 'noah.learner@example.com',
    learnerId: 'NOAH-006'
  },
  {
    name: 'Ava Learner',
    email: 'ava.learner@example.com',
    learnerId: 'AVA-007'
  }
];

async function seedLearnerBatch() {
  const passwordPlain = process.env.LEARNER_SEED_PASSWORD || 'password123';
  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  for (const learner of learnersFromTemplate) {
    try {
      const existing = await User.findOne({ email: learner.email });

      if (existing) {
        if (existing.role !== 'learner') {
          console.warn(
            `⚠️  Skipping ${learner.email} because it already exists with role ${existing.role}`
          );
          continue;
        }

        const needsUpdate =
          !existing.learnerProfile || existing.learnerProfile.learnerId !== learner.learnerId;

        if (needsUpdate) {
          existing.learnerProfile = {
            ...(existing.learnerProfile || {}),
            learnerId: learner.learnerId,
            courses: existing.learnerProfile?.courses || []
          };
          await existing.save();
          console.log(`🔄 Updated learner profile for ${learner.email}`);
        } else {
          console.log(`✅ Learner ${learner.email} already present`);
        }

        continue;
      }

      const newLearner = new User({
        name: learner.name,
        email: learner.email,
        password: passwordHash,
        role: 'learner',
        learnerProfile: {
          learnerId: learner.learnerId,
          courses: []
        }
      });

      await newLearner.save();
      console.log(`✅ Created learner ${learner.email}`);
    } catch (err) {
      console.error(`❌ Failed to seed learner ${learner.email}:`, err.message || err);
    }
  }
}

module.exports = { seedLearnerBatch };
