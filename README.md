# ProjectCamp

ProjectCamp is a full-stack project management app for small software teams. It combines project planning, task tracking, team management, invitations, and a Jira-style ticket board in one deployment.

The frontend is built with React, Vite, Tailwind CSS, Redux Toolkit, and Clerk. The backend is an Express API backed by MongoDB and serves the production frontend build from the same origin.

## What the app does

- Create and manage projects with required start and end dates
- Track tasks with status, assignee, priority, due date, and comments
- Manage project members and workspace-level invitations
- Use a Jira-style ticket board for bugs, support, incidents, and feature requests
- Comment on tickets and tasks for handoffs and discussion
- View dashboard and team-level summaries
- Run as a single production app from one Node service

## Current feature set

### Projects

- Create, update, and delete projects
- Required project timeline validation
- Project status, priority, progress, start date, and end date
- Project member management

### Tasks

- Create, update, and delete tasks
- Filter by status, type, priority, and assignee
- Task detail view with comments
- Subtasks support in the stored task model

### Tickets

- Jira-style status board
- Ticket categories: bug, feature request, support, incident, other
- Ticket priorities: low, medium, high, urgent
- Ticket discussion/comments
- Ticket editing, reassignment, and deletion
- Ticket access scoped to project membership

### Team and invitations

- Team directory from real project membership data
- Invitation records stored in MongoDB
- Manual invite-link fallback for no-domain setups
- Email sending via Resend for Render-friendly deployments

### Auth and deployment

- Clerk authentication
- MongoDB persistence
- Express serves the built frontend in production
- Render deployment supported

## Tech stack

### Frontend

- React 19
- Vite
- Tailwind CSS 4
- Redux Toolkit
- React Router
- Clerk React
- date-fns
- lucide-react
- recharts

### Backend

- Node.js
- Express
- MongoDB with Mongoose
- Clerk Express middleware
- Nodemailer

## Repo layout

```text
ProjectCamp/
|-- src/                # React frontend
|-- backend/            # Express API
|-- dist/               # Production frontend build (generated)
|-- package.json        # Frontend/root scripts
`-- backend/package.json
```

## Scripts

### Root

```bash
npm run dev         # frontend dev server
npm run build       # production frontend build
npm run lint        # lint frontend
npm start           # start backend
npm run start:prod  # build frontend, then start backend
```

### Backend

```bash
npm --prefix backend run dev
npm --prefix backend start
```

## Local setup

### 1. Install dependencies

```bash
npm install
npm --prefix backend install
```

### 2. Configure environment

Create these files from the examples:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env
```

### 3. Required environment variables

Frontend `.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
```

Backend `backend/.env`:

```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/projectcamp
CLIENT_URL=http://localhost:5173

CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret

RESEND_API_KEY=re_your_resend_api_key
MAIL_FROM=ProjectCamp <onboarding@resend.dev>
```

Optional SMTP fallback:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your.email@gmail.com
MAIL_PASS=your-16-char-app-password
```

### 4. Run in development

Frontend:

```bash
npm run dev
```

Backend:

```bash
npm --prefix backend run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

### 5. Run as a single production app locally

```bash
npm run start:prod
```

When `dist/index.html` exists, the backend serves the frontend build so the app runs from one origin.

## Production deployment

ProjectCamp is designed to run as one Node web service with MongoDB and Clerk.

### Recommended Render setup

Build command:

```bash
npm install --include=dev --include=optional && npm install @rollup/rollup-linux-x64-gnu lightningcss-linux-x64-gnu @tailwindcss/oxide-linux-x64-gnu --no-save && npm --prefix backend install && npm run build
```

Start command:

```bash
npm start
```

### Render environment variables

Required:

```env
MONGODB_URI=your_mongodb_uri
CLIENT_URL=https://your-app.onrender.com
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
NPM_CONFIG_PRODUCTION=false
```

Mail via Resend:

```env
RESEND_API_KEY=re_your_resend_api_key
MAIL_FROM=ProjectCamp <onboarding@resend.dev>
```

## Email and invitation notes

- On Render Free, outbound SMTP is unreliable or blocked, so Resend is the safer option.
- Resend test mode can send only to your own email address until you verify a domain.
- If you do not have a verified mail domain yet, the Team page includes a manual "Copy link" fallback for invitations.

## Data persistence

The app uses MongoDB for persistence. Important collections include:

- projects
- projectmembers
- tasks
- tickets
- ticketcomments
- invitations
- users

So yes: projects, tasks, tickets, comments, and invitations are stored in the database, not just browser state.

## Notes on current auth

- Development deployments can use Clerk test keys.
- Public production use should move to Clerk production keys and a custom domain you control.

## License

This project is licensed under the MIT License. See `LICENSE.md`.

## Maintainer

- GitHub: [indomitus069](https://github.com/indomitus069)
