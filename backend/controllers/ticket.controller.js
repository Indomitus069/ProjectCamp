const Ticket = require("../models/Ticket");
const TicketComment = require("../models/TicketComment");
const Project = require("../models/Project");
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

const buildTicketNumber = () =>
  `TCK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const mapTicketWithAssignee = async (ticket) => {
  if (!ticket?.assigneeId) return ticket;

  const user = await User.findOne({ clerkId: ticket.assigneeId }).lean();
  if (!user) return ticket;

  return {
    ...ticket,
    assignee: mapUser(user, ticket.assigneeId),
  };
};

const ensureProjectMembership = async (projectId, userId) => {
  const membership = await ProjectMember.findOne({ projectId, userId }).lean();
  if (!membership) {
    throw new ApiError(403, "Forbidden");
  }

  return membership;
};

const ensureTicketAccess = async (ticketId, userId) => {
  const ticket = await Ticket.findById(ticketId).lean();
  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  const membership = await ensureProjectMembership(ticket.projectId, userId);
  return { ticket, membership };
};

const ensureTicketDeleteAccess = async (ticketId, userId) => {
  const { ticket, membership } = await ensureTicketAccess(ticketId, userId);
  if (ticket.createdBy !== userId && !["admin", "project_admin"].includes(membership.role)) {
    throw new ApiError(403, "Only ticket creators or project admins can delete tickets");
  }

  return { ticket, membership };
};

const createTicket = asyncHandler(async (req, res) => {
  const { projectId, title, description, requesterName, requesterEmail, assigneeId, category, status, priority } = req.body;
  const { userId } = req.auth;

  if (!projectId) {
    throw new ApiError(400, "Project is required");
  }
  if (!title || !title.trim()) {
    throw new ApiError(400, "Ticket title is required");
  }

  const project = await Project.findById(projectId).lean();
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  await ensureProjectMembership(projectId, userId);

  if (assigneeId) {
    await ensureProjectMembership(projectId, assigneeId);
  }

  const ticket = await Ticket.create({
    ticketNumber: buildTicketNumber(),
    projectId,
    title: title.trim(),
    description,
    requesterName,
    requesterEmail,
    assigneeId,
    category,
    status,
    priority,
    createdBy: userId,
  });

  const ticketWithAssignee = await mapTicketWithAssignee(ticket.toObject());

  return res.status(201).json(new ApiResponse(201, ticketWithAssignee, "Ticket created successfully"));
});

const getTickets = asyncHandler(async (req, res) => {
  const { userId } = req.auth;

  const memberships = await ProjectMember.find({ userId }).select("projectId").lean();
  const projectIds = memberships.map((membership) => membership.projectId);

  const tickets = await Ticket.find({ projectId: { $in: projectIds } }).sort({ updatedAt: -1 }).lean();
  const ticketsWithAssignee = await Promise.all(tickets.map(mapTicketWithAssignee));

  return res.status(200).json(new ApiResponse(200, ticketsWithAssignee, "Tickets fetched successfully"));
});

const getTicketById = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  const { userId } = req.auth;

  const { ticket } = await ensureTicketAccess(ticketId, userId);
  const ticketWithAssignee = await mapTicketWithAssignee(ticket);

  return res.status(200).json(new ApiResponse(200, ticketWithAssignee, "Ticket fetched successfully"));
});

const updateTicket = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  const { userId } = req.auth;
  const updateData = req.body || {};

  const { ticket } = await ensureTicketAccess(ticketId, userId);

  if (updateData.projectId && String(updateData.projectId) !== String(ticket.projectId)) {
    throw new ApiError(400, "Changing the ticket project is not supported");
  }

  if (updateData.assigneeId) {
    await ensureProjectMembership(ticket.projectId, updateData.assigneeId);
  }

  const updatedTicket = await Ticket.findByIdAndUpdate(ticketId, updateData, {
    new: true,
    runValidators: true,
  }).lean();

  if (!updatedTicket) {
    throw new ApiError(404, "Ticket not found");
  }

  const ticketWithAssignee = await mapTicketWithAssignee(updatedTicket);

  return res.status(200).json(new ApiResponse(200, ticketWithAssignee, "Ticket updated successfully"));
});

const deleteTicket = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  const { userId } = req.auth;

  await ensureTicketDeleteAccess(ticketId, userId);

  const ticket = await Ticket.findByIdAndDelete(ticketId);
  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  await TicketComment.deleteMany({ ticketId });

  return res.status(200).json(new ApiResponse(200, null, "Ticket deleted successfully"));
});

const getTicketComments = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  const { userId } = req.auth;

  await ensureTicketAccess(ticketId, userId);

  const comments = await TicketComment.find({ ticketId }).sort({ createdAt: 1 }).lean();
  const commentsWithUsers = await Promise.all(
    comments.map(async (comment) => {
      const user = await User.findOne({ clerkId: comment.createdBy }).lean();
      return {
        ...comment,
        user: mapUser(user, comment.createdBy),
      };
    })
  );

  return res.status(200).json(new ApiResponse(200, commentsWithUsers, "Ticket comments fetched successfully"));
});

const createTicketComment = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  const { userId } = req.auth;
  const { content } = req.body;

  if (!content || !content.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  await ensureTicketAccess(ticketId, userId);

  const comment = await TicketComment.create({
    ticketId,
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
      "Ticket comment created successfully"
    )
  );
});

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  getTicketComments,
  createTicketComment,
};
