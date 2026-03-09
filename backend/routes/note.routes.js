const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const { checkProjectRole } = require("../middlewares/role.middleware");
const {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
} = require("../controllers/note.controller");

router.use(requireAuth);

router.post("/:projectId", checkProjectRole(["admin"]), createNote);
router.get("/:projectId", checkProjectRole(["admin", "project_admin", "member"]), getNotes);
router.put("/:noteId", updateNote); // Ideally check role via project membership
router.delete("/:noteId", deleteNote);

module.exports = router;
