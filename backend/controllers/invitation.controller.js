const Invitation = require("../models/Invitation");
const Project = require("../models/Project");
const ProjectMember = require("../models/ProjectMember");
const User = require("../models/User");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendInvitationEmail } = require("../utils/mailer");

const createInvitation = asyncHandler(async (req, res) => {
  const { email, role, workspaceId } = req.body;
  const { userId } = req.auth;

  if (!email || !email.trim()) {
    throw new ApiError(400, "Email is required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const wId = workspaceId || "default";
  const invRole = role === "org:admin" ? "org:admin" : "org:member";

  const existing = await Invitation.findOne({
    workspaceId: wId,
    email: normalizedEmail,
    status: "pending",
  });
  if (existing) {
    throw new ApiError(409, "An invitation has already been sent to this email for this workspace");
  }

  const invitation = await Invitation.create({
    email: normalizedEmail,
    role: invRole,
    workspaceId: wId,
    invitedBy: userId,
    status: "pending",
  });

  // Send invitation email (non-blocking; log failure but don't fail the request)
  const workspaceName = "My Workspace";
  const inviter = await User.findOne({ clerkId: userId }).lean();
  const mailResult = await sendInvitationEmail({
    to: normalizedEmail,
    inviterEmail: inviter?.email || null,
    workspaceName,
    role: invRole,
    acceptUrl: `${process.env.CLIENT_URL || "http://localhost:5173"}/accept-invitation?invitationId=${invitation._id}`,
  });

  if (!mailResult.sent) {
    await Invitation.findByIdAndDelete(invitation._id);
    throw new ApiError(502, `Invitation email could not be sent: ${mailResult.error || "unknown mail error"}`);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, invitation, "Invitation sent successfully"));
});

const getInvitations = asyncHandler(async (req, res) => {
  const { userId } = req.auth;
  const { workspaceId } = req.query;
  const wId = workspaceId || "default";

  const invitations = await Invitation.find({
    invitedBy: userId,
    workspaceId: wId,
    status: { $in: ["pending", "accepted"] },
  }).sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, invitations, "Invitations fetched successfully"));
});

const acceptInvitation = asyncHandler(async (req, res) => {
  const { invitationId } = req.params;
  const { userId } = req.auth;

  const invitation = await Invitation.findById(invitationId);
  if (!invitation) {
    throw new ApiError(404, "Invitation not found");
  }

  if (invitation.status !== "pending") {
    throw new ApiError(400, "Invitation has already been used");
  }

  const user = await User.findOne({ clerkId: userId });
  if (!user || user.email?.toLowerCase() !== invitation.email) {
    throw new ApiError(403, "Sign in with the invited email address to accept this invitation");
  }

  const inviterProjects = await Project.find({ createdBy: invitation.invitedBy }).select("_id");
  const membershipRole = invitation.role === "org:admin" ? "project_admin" : "member";

  await Promise.all(
    inviterProjects.map((project) =>
      ProjectMember.findOneAndUpdate(
        { projectId: project._id, userId },
        { $setOnInsert: { role: membershipRole } },
        { upsert: true, new: true }
      )
    )
  );

  invitation.status = "accepted";
  await invitation.save();

  return res
    .status(200)
    .json(new ApiResponse(200, invitation, "Invitation accepted successfully"));
});

module.exports = {
  createInvitation,
  getInvitations,
  acceptInvitation,
};
