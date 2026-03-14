const Task = require("../models/Task");
const SubTask = require("../models/SubTask");
const TaskComment = require("../models/TaskComment");
const ProjectMember = require("../models/ProjectMember");
const User = require("../models/User");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

const mapUser = (user, fallbackId) => ({
  id: user?.clerkId || fallbackId,
  name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Unknown",
  email: user?.email || "Unknown",
  imageUrl: user?.imageUrl || "",
  image: user?.imageUrl || "",
});

const mapTaskWithAssignee = async (task) => {
  if (!task.assigneeId) return task;

  const user = await User.findOne({ clerkId: task.assigneeId }).lean();
  if (!user) return task;

  return {
    ...task,
    assignee: {
      id: user.clerkId,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
      imageUrl: user.imageUrl,
      image: user.imageUrl,
    },
  };
};

const ensureTaskAccess = async (taskId, userId) => {
  const task = await Task.findById(taskId).lean();
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const membership = await ProjectMember.findOne({
    projectId: task.projectId,
    userId,
  }).lean();

  if (!membership) {
    throw new ApiError(403, "Forbidden");
  }

  return task;
};

const ensureTaskMutationAccess = async (taskId, userId) => {
  const task = await ensureTaskAccess(taskId, userId);
  return task;
};

const ensureSubTaskAccess = async (subTaskId, userId) => {
  const subTask = await SubTask.findById(subTaskId).lean();
  if (!subTask) {
    throw new ApiError(404, "Subtask not found");
  }

  await ensureTaskAccess(subTask.taskId, userId);
  return subTask;
};

const createTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { title, description, assigneeId, status, priority, type, dueDate } = req.body;
  const { userId } = req.auth;

  if (!title) {
    throw new ApiError(400, "Task title is required");
  }

  const task = await Task.create({
    title,
    description,
    projectId,
    assigneeId,
    status,
    priority,
    type,
    dueDate,
    createdBy: userId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, task, "Task created successfully"));
});

const getTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const tasks = await Task.find({ projectId }).lean();

  // Manually populate assignee since it's a Clerk ID string
  const tasksWithAssignee = await Promise.all(tasks.map(mapTaskWithAssignee));

  return res
    .status(200)
    .json(new ApiResponse(200, tasksWithAssignee, "Tasks fetched successfully"));
});

const getTaskById = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { userId } = req.auth;
  const task = await ensureTaskAccess(taskId, userId);

  const taskWithAssignee = await mapTaskWithAssignee(task);

  return res
    .status(200)
    .json(new ApiResponse(200, taskWithAssignee, "Task fetched successfully"));
});

const updateTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const updateData = req.body;
  const { userId } = req.auth;

  await ensureTaskMutationAccess(taskId, userId);

  const task = await Task.findByIdAndUpdate(taskId, updateData, {
    new: true,
    runValidators: true,
  }).lean();

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const taskWithAssignee = await mapTaskWithAssignee(task);

  return res
    .status(200)
    .json(new ApiResponse(200, taskWithAssignee, "Task updated successfully"));
});

const deleteTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { userId } = req.auth;

  await ensureTaskMutationAccess(taskId, userId);
  const task = await Task.findByIdAndDelete(taskId);

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  // Clean up subtasks
  await SubTask.deleteMany({ taskId });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Task deleted successfully"));
});

const getTaskComments = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { userId } = req.auth;

  await ensureTaskAccess(taskId, userId);

  const comments = await TaskComment.find({ taskId }).sort({ createdAt: 1 }).lean();
  const commentsWithUsers = await Promise.all(
    comments.map(async (comment) => {
      const user = await User.findOne({ clerkId: comment.createdBy }).lean();
      return {
        ...comment,
        user: mapUser(user, comment.createdBy),
      };
    })
  );

  return res
    .status(200)
    .json(new ApiResponse(200, commentsWithUsers, "Comments fetched successfully"));
});

const createTaskComment = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { userId } = req.auth;
  const { content } = req.body;

  if (!content || !content.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  await ensureTaskAccess(taskId, userId);

  const comment = await TaskComment.create({
    taskId,
    createdBy: userId,
    content: content.trim(),
  });

  const user = await User.findOne({ clerkId: userId }).lean();

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        ...comment.toObject(),
        user: mapUser(user, userId),
      },
      "Comment created successfully"
    )
  );
});

// Subtask handlers
const createSubTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { title } = req.body;
  const { userId } = req.auth;

  if (!title) {
    throw new ApiError(400, "Subtask title is required");
  }

  await ensureTaskAccess(taskId, userId);

  const subTask = await SubTask.create({
    taskId,
    title,
    createdBy: userId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, subTask, "Subtask created successfully"));
});

const updateSubTask = asyncHandler(async (req, res) => {
  const { subTaskId } = req.params;
  const { title, isCompleted } = req.body;
  const { userId } = req.auth;

  await ensureSubTaskAccess(subTaskId, userId);

  const subTask = await SubTask.findByIdAndUpdate(
    subTaskId,
    { title, isCompleted },
    { new: true, runValidators: true }
  );

  if (!subTask) {
    throw new ApiError(404, "Subtask not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, subTask, "Subtask updated successfully"));
});

const deleteSubTask = asyncHandler(async (req, res) => {
  const { subTaskId } = req.params;
  const { userId } = req.auth;

  await ensureSubTaskAccess(subTaskId, userId);
  const subTask = await SubTask.findByIdAndDelete(subTaskId);

  if (!subTask) {
    throw new ApiError(404, "Subtask not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Subtask deleted successfully"));
});

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskComments,
  createTaskComment,
  createSubTask,
  updateSubTask,
  deleteSubTask,
};
