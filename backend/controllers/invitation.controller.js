const Invitation = require("../models/Invitation");
const Project = require("../models/Project");
const ProjectMember = require("../models/ProjectMember");
const User = require("../models/User");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendInvitationEmail } = require("../utils/mailer");

const buildAcceptUrl = (invitationId) =>
  `${process.env.CLIENT_URL || "http://localhost:5173"}/accept-invitation?invitationId=${invitationId}`;

const sendInvitationOrThrow = async ({ invitation, inviterEmail, workspaceName, role, removeOnFailure = false }) => {
  const mailResult = await sendInvitationEmail({
    to: invitation.email,
    inviterEmail,
    workspaceName,
    role,
    acceptUrl: buildAcceptUrl(invitation._id),
  });

  if (!mailResult.sent) {
    if (removeOnFailure) {
      await Invitation.findByIdAndDelete(invitation._id);
    }

    throw new ApiError(502, `Invitation email could not be sent: ${mailResult.error || "unknown mail error"}`);
  }
};

const createInvitation = asyncHandler(async (req, res) => {
  const { email, role, workspaceId } = req.body;
  const { userId } = req.auth;

  if (!email || !email.trim()) {
    throw new ApiError(400, "Email is required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const wId = workspaceId || "default";
  const invRole = role === "org:admin" ? "org:admin" : "org:member";
  const workspaceName = "My Workspace";
  const inviter = await User.findOne({ clerkId: userId }).lean();

  const existing = await Invitation.findOne({
    workspaceId: wId,
    email: normalizedEmail,
    status: "pending",
  });
  if (existing) {
    existing.role = invRole;
    existing.invitedBy = userId;
    await existing.save();

    await sendInvitationOrThrow({
      invitation: existing,
      inviterEmail: inviter?.email || null,
      workspaceName,
      role: invRole,
      removeOnFailure: false,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, existing, "Invitation refreshed successfully"));
  }

  const invitation = await Invitation.create({
    email: normalizedEmail,
    role: invRole,
    workspaceId: wId,
    invitedBy: userId,
    status: "pending",
  });

  await sendInvitationOrThrow({
    invitation,
    inviterEmail: inviter?.email || null,
    workspaceName,
    role: invRole,
    removeOnFailure: true,
  });

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

const resendInvitation = asyncHandler(async (req, res) => {
  const { invitationId } = req.params;
  const { userId } = req.auth;

  const invitation = await Invitation.findById(invitationId);
  if (!invitation) {
    throw new ApiError(404, "Invitation not found");
  }

  if (invitation.invitedBy !== userId) {
    throw new ApiError(403, "You can only resend invitations you created");
  }

  if (invitation.status !== "pending") {
    throw new ApiError(400, "Only pending invitations can be resent");
  }

  const inviter = await User.findOne({ clerkId: userId }).lean();
  invitation.updatedAt = new Date();
  await invitation.save();

  await sendInvitationOrThrow({
    invitation,
    inviterEmail: inviter?.email || null,
    workspaceName: "My Workspace",
    role: invitation.role,
    removeOnFailure: false,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, invitation, "Invitation resent successfully"));
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
  resendInvitation,
  acceptInvitation,
};
