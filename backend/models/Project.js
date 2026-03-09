const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: String, // Clerk User ID
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "planning", "completed", "on_hold", "cancelled"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);
