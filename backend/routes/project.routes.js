const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const { checkProjectRole } = require("../middlewares/role.middleware");
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} = require("../controllers/project.controller");

router.use(requireAuth);

router.post("/", createProject);
router.get("/", getProjects);
router.get("/:projectId", checkProjectRole(["admin", "project_admin", "member"]), getProjectById);
router.put("/:projectId", checkProjectRole(["admin"]), updateProject);
router.delete("/:projectId", checkProjectRole(["admin"]), deleteProject);

module.exports = router;
