# Contributing to SideQuest

First off, thank you for considering contributing to SideQuest! It is campus-focused errand marketplaces like this that keep student lives efficient and productive.

---

## 🛠️ Local Development Setup

To set up a local testing workspace for SideQuest:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Eraiyamuthan-P/SideQuest.git
   cd SideQuest
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill out required variables (database connection string, JWT secret, and Google OAuth credentials).
   ```bash
   cp .env.example .env
   ```

4. **Sync Schema & Seed Data**:
   Ensure PostgreSQL is running locally, then push the schema and seed mock accounts:
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

5. **Start Dev Server**:
   ```bash
   npm run dev
   ```

---

## 📐 Coding & Linting Standards

- Write clean, declarative React components utilizing modern Hooks.
- Ensure strict TypeScript compilations pass without warnings.
- Preserve all existing comments and documentation lines.

---

## 📜 Commit Style

We follow the Conventional Commits structure:

- `feat:` for new features (e.g. `feat: implement rating system`)
- `fix:` for bugs (e.g. `fix: correct layout displacement`)
- `docs:` for documentation updates (e.g. `docs: add contributing guide`)
- `style:` for changes that do not affect the meaning of the code (formatting, css styles)
- `test:` for adding or updating tests

---

## 🌿 Branch Naming & Pull Requests

1. Create a branch indicating category and scope: `feature/user-profiles` or `bugfix/sidebar-overflow`.
2. Push your changes to your fork and submit a Pull Request targeting the `main` branch.
3. Ensure the automated CI/CD checks pass successfully on your PR.
