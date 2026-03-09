const ProjectMember = require("../models/ProjectMember");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

const checkProjectRole = (allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    const { userId } = req.auth;
    const { projectId } = req.params;

    if (!projectId) {
      throw new ApiError(400, "Project ID is required");
    }

    const membership = await ProjectMember.findOne({
      projectId,
      userId,
    });

    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new ApiError(403, "Forbidden: You do not have the required role");
    }

    req.projectRole = membership.role;
    next();
  });
};

module.exports = { checkProjectRole };
