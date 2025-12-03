const mongoose = require("mongoose");

const ROLES = ["learner", "institute", "institution", "admin"];

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    // Approval flag for institute/institution accounts. Defaults to true to
    // preserve existing behavior for seeded/demo accounts. New institute
    // registrations will be set to false during registration flow.
    isApproved: { type: Boolean, default: true },
    learnerProfile: {
      learnerId: { type: String, trim: true, unique: true, sparse: true },
      courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    },
    instituteProfile: {
      registrationId: { type: String, trim: true, unique: true, sparse: true },
      verificationKey: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

UserSchema.index(
  { "learnerProfile.learnerId": 1 },
  { unique: true, sparse: true }
);
UserSchema.index(
  { "instituteProfile.registrationId": 1 },
  { unique: true, sparse: true }
);

UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model("User", UserSchema);
