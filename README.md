# TaskFlow

TaskFlow is a MERN task-management application with account registration, sign-in, and a personal task dashboard. Users can create, view, update, filter, search, and delete their own tasks.

## Features

- Email and password registration and login
- JWT-protected current-user and task APIs
- User-owned task CRUD with `todo`, `in_progress`, and `done` statuses
- Task status filtering and text search
- Responsive React dashboard with task summaries and form feedback
- Health endpoint at `GET /api/health`

## Architecture

- **Client:** React 19 and Vite
- **API:** Node.js and Express 5
- **Database:** MongoDB with Mongoose
- **Validation and security:** Zod, bcryptjs, JSON Web Tokens, Helmet, CORS, and express-rate-limit

The project keeps the frontend in `client/` and backend in `server/`. The API listens on port 5000 by default, and the Vite development server uses port 5173 by default.

## AI Development Experience

I used Code0 during development to plan and implement TaskFlow in reviewed steps. I treated its suggestions as drafts: I checked the relevant routes, models, middleware, and diffs, and kept changes within the agreed scope. I manually checked backend startup and the `/api/health` response, then used automated API tests with an in-memory MongoDB and the frontend production build to validate behavior. When startup and API issues appeared, I traced them through the server entry point and request flow, corrected the causes, and reran the relevant checks. Code0 assisted with the work; I reviewed decisions and results rather than treating AI output as independently completed or verified.

## Specific Tasks Completed Using Code0

1. Developed Express.js authentication and task-management APIs, including protected task operations scoped to each user.
2. Created MongoDB/Mongoose user and task models and configured the database connection before the server accepts requests.
3. Built React components for authentication and task CRUD, search, and filtering.
4. Debugged application startup and API issues, and implemented rate limiting for registration and login.
5. Ran backend tests and the frontend production build, then reviewed Git ignore rules and submission readiness.

## Prerequisites

- A supported Node.js and npm installation
- MongoDB running locally or a MongoDB connection URI you can use

## Environment setup

Copy the backend example file to create your local backend configuration:

```powershell
Copy-Item server/.env.example server/.env
```

Edit `server/.env` for your environment. Set `MONGODB_URI` to your MongoDB connection URI and replace the example `JWT_SECRET` placeholder with a strong random secret. Keep `server/.env` private; it is ignored by Git.

The client can use the safe example configuration:

```powershell
Copy-Item client/.env.example client/.env
```

`VITE_API_BASE_URL` is public client configuration that points to the API (locally, `http://localhost:5000/api`). Vite embeds client environment values in the built frontend, so never put passwords, signing keys, database URIs, or other secrets in client environment files.

## Install dependencies

Run these commands from the repository root:

```powershell
npm.cmd --prefix server install
npm.cmd --prefix client install
```

## Run locally

Start the backend in one terminal:

```powershell
npm.cmd --prefix server run dev
```

Start the frontend in a second terminal:

```powershell
npm.cmd --prefix client run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`. The backend connects to MongoDB before it starts accepting API requests.

## Tests

Run the backend API tests from the repository root:

```powershell
npm.cmd --prefix server test
```

The API test suite uses an in-memory MongoDB instance; it does not require your configured application database.

## Security notes

- Passwords are hashed with bcryptjs and password hashes are excluded from API responses.
- JWTs are signed with the server-side `JWT_SECRET`; authenticated task queries are scoped to the owning user.
- Request data is validated, and registration/login requests are rate limited.
- Helmet sets security-related HTTP headers; CORS is configured by the backend.
- Keep `server/.env` and all real credentials out of source control. Client `VITE_*` values are public and must not contain secrets.
