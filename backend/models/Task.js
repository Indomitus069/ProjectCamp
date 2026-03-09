const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    assigneeId: {
      type: String, // Clerk User ID
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "done"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    type: {
      type: String,
      enum: ["task", "bug", "feature", "improvement", "other"],
      default: "task",
    },
    dueDate: {
      type: Date,
    },
    attachments: [
      {
        url: String,
        name: String,
        mimetype: String,
        size: Number,
      },
    ],
    createdBy: {
      type: String, // Clerk User ID
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
