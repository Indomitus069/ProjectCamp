const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  getTicketComments,
  createTicketComment,
} = require("../controllers/ticket.controller");

router.use(requireAuth);

router.get("/", getTickets);
router.post("/", createTicket);
router.get("/:ticketId", getTicketById);
router.put("/:ticketId", updateTicket);
router.delete("/:ticketId", deleteTicket);
router.get("/:ticketId/comments", getTicketComments);
router.post("/:ticketId/comments", createTicketComment);

module.exports = router;
