const Project = require("../models/Project");
const ProjectMember = require("../models/ProjectMember");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { userId } = req.auth;

  if (!name) {
    throw new ApiError(400, "Project name is required");
  }

  const project = await Project.create({
    name,
    description,
    createdBy: userId,
  });

  // Automatically make creator the admin
  await ProjectMember.create({
    projectId: project._id,
    userId,
    role: "admin",
  });

  return res
    .status(201)
    .json(new ApiResponse(201, project, "Project created successfully"));
});

const getProjects = asyncHandler(async (req, res) => {
  const { userId } = req.auth;

  // Find all project memberships for this user
  const memberships = await ProjectMember.find({ userId }).populate("projectId");
  
  const projects = memberships.map(m => m.projectId);

  return res
    .status(200)
    .json(new ApiResponse(200, projects, "Projects fetched successfully"));
});

const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project fetched successfully"));
});

const updateProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, description, status } = req.body;

  const project = await Project.findByIdAndUpdate(
    projectId,
    { name, description, status },
    { new: true, runValidators: true }
  );

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project updated successfully"));
});

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findByIdAndDelete(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Clean up memberships
  await ProjectMember.deleteMany({ projectId });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Project deleted successfully"));
});

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
