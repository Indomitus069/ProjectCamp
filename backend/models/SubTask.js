const mongoose = require("mongoose");

const subTaskSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String, // Clerk User ID
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubTask", subTaskSchema);
