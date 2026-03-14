const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const { createInvitation, getInvitations, acceptInvitation } = require("../controllers/invitation.controller");

router.use(requireAuth);

router.post("/", createInvitation);
router.get("/", getInvitations);
router.post("/:invitationId/accept", acceptInvitation);

module.exports = router;
