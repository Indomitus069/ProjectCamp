const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const { checkProjectRole } = require("../middlewares/role.middleware");
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  createSubTask,
  updateSubTask,
  deleteSubTask,
} = require("../controllers/task.controller");

router.use(requireAuth);

// Task routes
router.post("/:projectId", checkProjectRole(["admin", "project_admin"]), createTask);
router.get("/:projectId", checkProjectRole(["admin", "project_admin", "member"]), getTasks);
router.get("/single/:taskId", getTaskById);
router.put("/:taskId", updateTask); // Frontend needs to pass IDs or have specific role checks
router.delete("/:taskId", deleteTask);

// Subtask routes
router.post("/:taskId/subtasks", createSubTask);
router.put("/subtasks/:subTaskId", updateSubTask);
router.delete("/subtasks/:subTaskId", deleteSubTask);

module.exports = router;
