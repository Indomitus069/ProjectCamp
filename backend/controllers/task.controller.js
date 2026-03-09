const Task = require("../models/Task");
const SubTask = require("../models/SubTask");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

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
  const tasks = await Task.find({ projectId });

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
});

const getTaskById = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const task = await Task.findById(taskId);

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task fetched successfully"));
});

const updateTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const updateData = req.body;

  const task = await Task.findByIdAndUpdate(taskId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task updated successfully"));
});

const deleteTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
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

// Subtask handlers
const createSubTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { title } = req.body;
  const { userId } = req.auth;

  if (!title) {
    throw new ApiError(400, "Subtask title is required");
  }

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
  createSubTask,
  updateSubTask,
  deleteSubTask,
};
