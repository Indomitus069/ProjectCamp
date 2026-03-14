const Project = require("../models/Project");
const ProjectMember = require("../models/ProjectMember");
const Task = require("../models/Task");
const User = require("../models/User");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

const mapUser = (user, fallbackId) => ({
  id: user?.clerkId || fallbackId,
  email: user?.email || "Unknown",
  name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Unknown",
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

const createProject = asyncHandler(async (req, res) => {
  const { name, description, status, priority, progress, startDate, endDate } = req.body;
  const { userId } = req.auth;

  if (!name) {
    throw new ApiError(400, "Project name is required");
  }

  const project = await Project.create({
    name,
    description,
    createdBy: userId,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(progress != null ? { progress } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
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
  
  const projects = await Promise.all(memberships.map(async (m) => {
    if (!m.projectId) return null;
    
    // Get project as plain object
    const projectObj = m.projectId.toObject();
    
    // Fetch tasks for this project
    const tasks = await Task.find({ projectId: projectObj._id }).lean();
    
    // Manually populate assignee for each task
    const tasksWithAssignee = await Promise.all(tasks.map(mapTaskWithAssignee));
    
    projectObj.tasks = tasksWithAssignee;

    // Fetch members for this project
    const projectMembers = await ProjectMember.find({ projectId: projectObj._id }).lean();
    const membersWithDetails = await Promise.all(projectMembers.map(async (pm) => {
      const user = await User.findOne({ clerkId: pm.userId }).lean();
      return {
        userId: pm.userId,
        role: pm.role,
        user: mapUser(user, pm.userId),
      };
    }));
    
    projectObj.members = membersWithDetails;
    
    return projectObj;
  }));

  const filteredProjects = projects.filter(p => p !== null);

  return res
    .status(200)
    .json(new ApiResponse(200, filteredProjects, "Projects fetched successfully"));
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
  const { name, description, status, priority, progress, startDate, endDate } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (progress !== undefined) updateData.progress = progress;
  if (startDate !== undefined) updateData.startDate = startDate;
  if (endDate !== undefined) updateData.endDate = endDate;

  const project = await Project.findByIdAndUpdate(
    projectId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project updated successfully"));
});

const addProjectMember = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { email, role } = req.body;

  if (!email || !email.trim()) {
    throw new ApiError(400, "Member email is required");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).lean();
  if (!user) {
    throw new ApiError(404, "No user with that email has joined ProjectCamp yet");
  }

  const projectRole = ["admin", "project_admin", "member"].includes(role) ? role : "member";

  const membership = await ProjectMember.findOneAndUpdate(
    { projectId, userId: user.clerkId },
    { $setOnInsert: { role: projectRole } },
    { new: true, upsert: true }
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        projectId,
        userId: membership.userId,
        role: membership.role,
        user: mapUser(user, membership.userId),
      },
      "Project member added successfully"
    )
  );
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
  addProjectMember,
  deleteProject,
};
