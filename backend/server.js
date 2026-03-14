require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
const { clerkMiddleware } = require("@clerk/express");
const connectDB = require("./config/db");
const ApiError = require("./utils/apiError");
const { verifyMailTransport } = require("./utils/mailer");

const app = express();
const distDir = path.resolve(__dirname, "../dist");
const hasFrontendBuild = fs.existsSync(path.join(distDir, "index.html"));
const clientOrigin = process.env.CLIENT_URL || true;

// Middleware
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(clerkMiddleware());

// Routes import
const systemRoutes = require("./routes/system.routes");
const projectRoutes = require("./routes/project.routes");
const taskRoutes = require("./routes/task.routes");
const noteRoutes = require("./routes/note.routes");
const invitationRoutes = require("./routes/invitation.routes");

// Routes declaration
app.use("/api/v1/system", systemRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/notes", noteRoutes);
app.use("/api/v1/invitations", invitationRoutes);

if (hasFrontendBuild) {
  app.use(express.static(distDir));

  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

// Error handling
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  console.error(err);
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

const PORT = process.env.PORT || 8000;

connectDB().then(() => {
  verifyMailTransport().catch((error) => {
    console.error("Mail transport startup check failed:", error?.message || error);
  });

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Stop the existing process or set a different PORT in backend/.env.`);
      process.exit(1);
    }

    console.error("Server failed to start:", error);
    process.exit(1);
  });
});
