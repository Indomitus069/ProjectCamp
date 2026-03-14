const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ["org:member", "org:admin"],
      default: "org:member",
    },
    workspaceId: {
      type: String,
      default: "default",
    },
    invitedBy: {
      type: String, // Clerk User ID
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "revoked"],
      default: "pending",
    },
  },
  { timestamps: true }
);

invitationSchema.index({ workspaceId: 1, email: 1 });

module.exports = mongoose.model("Invitation", invitationSchema);
