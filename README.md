# SideQuest

### Hyperlocal Campus Marketplace | Built Exclusively for VIT Students

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-indigo?style=flat&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-blue?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![JWT](https://img.shields.io/badge/Auth-JWT-orange?style=flat)](https://jwt.io/)
[![PWA](https://img.shields.io/badge/PWA-Ready-green?style=flat)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat)](/LICENSE)

---

SideQuest is a premium, hyperlocal peer-to-peer campus task marketplace designed exclusively for students and faculty at **Vellore Institute of Technology (VIT)**. It provides a secure, domain-restricted space to delegate daily chores, tutoring, and freelance work to fellow campus residents while preserving academic integrity and credit-based trust scores.

---

## 🚀 Live Demo
*(Placeholder: Production deployment URL pending)*
👉 [https://sidequest-vit.vercel.app](https://sidequest-vit.vercel.app)

---

## 📸 Screenshots
- **Landing Page & Browse Board**: Shimmering card layouts, location-based query inputs, and sorting.
- **Quest Details**: Counter-bidding options, deadline indicators, and poster metrics.
- **Real-Time Inbox**: Safe coordination chats, templates, and read-only locks.
- **Leaderboard**: Student standings ranked by active credit profiles.
- **Moderation Console (`/admin`)**: Logs tracking dispute resolutions, audit trails, and connection latency widgets.

---

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack compiling)
- **Language**: TypeScript
- **Database ORM**: Prisma Client
- **Database**: PostgreSQL (SSL Adapter connection pooling)
- **Styling**: Vanilla CSS (TailwindCSS avoided, custom slate-dark variables)
- **Token Authorization**: Secure HTTP-Only JWT Cookies

---

## 📐 System Workflow

```mermaid
graph TD
  Student([VIT Student / Operator]) -->|Next.js Client| NextJS[Next.js App Router Server]
  NextJS -->|getSessionUser Auth| AuthMiddleware[Auth & Session Validator]
  NextJS -->|Query Client| Prisma[Prisma ORM]
  Prisma -->|PostgreSQL Adapter| PG[(PostgreSQL Database)]
```

### Request Flow
```mermaid
sequenceDiagram
    participant Student as Student Browser
    participant API as Auth API (/api/auth)
    participant DB as PostgreSQL Database
    participant SMTP as Email SMTP Service

    Student->>API: POST /request-otp (email)
    API->>DB: Upsert OTP Code & Timestamp
    API->>SMTP: Dispatch OTP Verification Code
    Student->>API: POST /verify-otp (email, code)
    API->>DB: Validate code and check 30-day invitation role limits
    API->>Student: Set HTTP-Only Secure JWT Cookie (sessionVersion = 1)
```

---

## 📁 Folder Structure

```text
SideQuest/
├── docs/                     # Engineering design guides
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── DATABASE.md
├── prisma/                   # Schema modeling & seeder scripts
│   ├── schema.prisma
│   └── seed.ts
├── public/                   # Static icons & PWA assets
│   └── manifest.json
└── src/
    ├── app/                  # Routing pages & endpoints
    │   ├── admin/            # Moderation dashboard
    │   ├── api/              # REST controllers
    │   ├── globals.css       # Slate dark style variables
    │   └── layout.tsx        # Toast and Shortcut providers
    ├── components/           # Icons, loaders, empty state cards
    ├── lib/                  # Auth checks & JWT tokens
    └── tests/                # Business logic testing rules
```

---

## 🔧 Installation & Local Setup

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
   ```bash
   cp .env.example .env
   ```

4. **Sync Schema & Seed Data**:
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

5. **Start Dev Server**:
   ```bash
   npm run dev
   ```

---

## 🧪 Testing

We run a strict suite of unit tests to verify business operations before compilation passes:

```bash
npm run test
```

### Build Check
```bash
npm run build
```

---

## 🛡️ Security Configuration
- **Access Restrictions**: Only `@vitstudent.ac.in` handles are permitted to authenticate.
- **Session Revocation**: Stale JWT tokens are rejected immediately when database `sessionVersion` increments during moderation updates.
- **Soft Deletes**: Suspended profiles are hidden while maintaining audit logs for compliance tracking.

---

## 📄 License
This project is licensed under the MIT License. See the [LICENSE](/LICENSE) file for details.

---

## ✍️ Author
Developed with ❤️ by **Eraiyamuthan** (VIT University).
