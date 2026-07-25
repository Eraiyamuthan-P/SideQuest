# Database Schema & Models Documentation

This document describes the PostgreSQL database models, relationships, and custom indexing schemas configured in the Prisma client.

---

## 🗃️ Models Overview

### 1. `User`
- **Fields**:
  - `id`: String (UUID, primary key)
  - `email`: String (Unique, forced lowercase)
  - `username`: String (Unique)
  - `verified`: Boolean
  - `credits`: Int (Default: 100)
  - `role`: Enum (`STUDENT`, `MODERATOR`, `ADMIN`, `SUPER_ADMIN`)
  - `status`: Enum (`ACTIVE`, `SUSPENDED`, `BANNED`)
  - `sessionVersion`: Int (Default: 1)
  - `deletedAt`: DateTime (Nullable for Soft Deletes)
  - `created_at`: DateTime (Default: now)

### 2. `Task` (Quest)
- **Fields**:
  - `id`: String (UUID, PK)
  - `poster_id`: String (FK to User)
  - `title`: String
  - `description`: String
  - `category`: Enum (`TUTORING`, `FOOD_PICKUP`, `RIDE_SHARING`, `PARCEL_DELIVERY`, etc.)
  - `offeredAmount`: Int
  - `deadline`: DateTime
  - `location`: Enum (`MENS_HOSTEL`, `WOMENS_HOSTEL`, `TT`, `SJT`, etc.)
  - `people_needed`: Int
  - `assignment_mode`: String
  - `status`: Enum (`OPEN`, `ASSIGNED`, `PENDING_PAYMENT`, `COMPLETED`, `CANCELLED`, `DISPUTED`)

### 3. `AuditLog`
- **Fields**:
  - `id`: String (UUID, PK)
  - `actorId`: String (FK to User)
  - `actorEmail`: String
  - `targetId`: String (Nullable)
  - `targetEmail`: String (Nullable)
  - `action`: String
  - `reason`: String
  - `metadata`: Json
  - `ipAddress`: String (Nullable)
  - `createdAt`: DateTime (Default: now)

---

## 🔗 Relationships Chart
- **One-to-Many**:
  - `User` ➔ `Task` (A user posts many quests).
  - `User` ➔ `TaskApplication` (A user applies to many quests).
  - `Task` ➔ `TaskApplication` (A quest receives multiple bids).
  - `User` ➔ `AuditLog` (Actor performs many actions).
- **One-to-One**:
  - `Task` ➔ `TaskEscalation` (A quest has at most one dispute record).
