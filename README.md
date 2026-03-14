<div align="center">
  <h1>🏕️ ProjectCamp</h1>
  <p>
    An open-source project management platform built with ReactJS, Tailwind CSS, and Express.js.
  </p>
</div>

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [🛠️ Tech Stack](#-tech-stack)
- [🚀 Getting Started](#-getting-started)
- [📜 License](#-license)
- [👤 Maintainer](#-maintainer)

---

## ✨ Features

- **Multiple Workspaces:** Create workspaces with their own projects, tasks, and members
- **Project Management:** Manage projects, tasks, and team members
- **Analytics:** View project analytics — progress, completion rate, and team size
- **Task Management:** Assign tasks, set due dates, track status (Todo, In Progress, Done)
- **Subtask Management:** Break tasks into subtasks with completion tracking
- **Project Notes:** Add and manage notes within projects
- **User Management:** Invite members, manage roles (Admin, Project Admin, Member)
- **Authentication:** JWT-based auth with email verification and password reset
- **File Attachments:** Upload and attach files to tasks

## 🛠️ Tech Stack

**Frontend:**
- ReactJS
- Tailwind CSS
- Redux Toolkit
- Lucide React (icons)
- Vite (build tool)

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- Multer (file uploads)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB instance (local or Atlas)

### Frontend Setup

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the frontend.

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

Backend runs on [http://localhost:8000](http://localhost:8000).

### Production Setup

Build the frontend and start the backend from the project root:

```bash
npm run start:prod
```

When `dist/index.html` exists, the Express backend serves the built frontend so the app can run from a single origin in production.

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/projectcamp
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_EXPIRY=1d
JWT_REFRESH_EXPIRY=7d
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
CLIENT_URL=http://localhost:5173
```

Optional frontend env in the project root:

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_BASE_URL=https://your-api-domain.example.com
```

If `VITE_API_BASE_URL` is not set, the frontend uses the current origin. That is the recommended production setup when the backend serves the built app.

### Invitation Emails on Render Free

Render Free blocks outbound SMTP, so Gmail SMTP invite sending will not work there.
Use Resend over HTTPS instead:

```env
RESEND_API_KEY=re_your_resend_api_key
MAIL_FROM=ProjectCamp <onboarding@resend.dev>
```

SMTP settings are still useful locally or on hosts that allow outbound SMTP.

---

## 📜 License

This project is licensed under the MIT License.

---

## 👤 Maintainer

**[indomitus069](https://github.com/indomitus069)**
