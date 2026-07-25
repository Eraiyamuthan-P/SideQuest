# SideQuest Technical Architecture

This document describes the design patterns, runtime environment, data flow, and security specifications of SideQuest.

---

## 🏗️ System Overview

SideQuest is a full-stack Next.js web application utilizing the React App Router architecture.

```mermaid
graph TD
  User([VIT Student / Operator]) -->|Next.js Client| NextJS[Next.js App Router Server]
  NextJS -->|getSessionUser Auth| AuthMiddleware[Auth & Session Validator]
  NextJS -->|Query Client| Prisma[Prisma ORM]
  Prisma -->|PostgreSQL Adapter| PG[(PostgreSQL Database)]
```

---

## 🔐 Authentication Flow

SideQuest features a closed OTP verification flow for `@vitstudent.ac.in` emails:

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

## 🛡️ Security Hierarchy

We implement a strict multi-tier role-based access control layout:

| Role | Permissions |
| ---- | ----------- |
| `STUDENT` | Create quests, bid, counter-bid, chat, and review fellow students. |
| `MODERATOR` | View support tickets, resolve active disputes, edit student verification. |
| `ADMIN` | Suspend or ban students, promote moderators, demote moderators. |
| `SUPER_ADMIN` | Permanent platform owners, manage admin invites, promote admins. |
