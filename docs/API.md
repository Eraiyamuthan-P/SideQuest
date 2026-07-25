# SideQuest REST API Catalog

All SideQuest API routes are mounted under the `/api/` prefix.

---

## 🔐 Authentication Endpoints

### 1. Request OTP
- **Method**: `POST`
- **Route**: `/api/auth/request-otp`
- **Auth**: None
- **Parameters**: None
- **Body**:
  ```json
  { "email": "student@vitstudent.ac.in" }
  ```
- **Response (200)**:
  ```json
  { "success": true, "message": "OTP sent to your VIT student email." }
  ```
- **Error (400)**:
  ```json
  { "error": "Only verified vitstudent.ac.in email addresses are allowed." }
  ```

### 2. Verify OTP
- **Method**: `POST`
- **Route**: `/api/auth/verify-otp`
- **Body**:
  ```json
  { "email": "student@vitstudent.ac.in", "otp": "123456" }
  ```
- **Response (200)**:
  ```json
  { "success": true, "user": { "id": "uuid", "username": "student_1", "role": "STUDENT" } }
  ```

---

## 📋 Task & Bid Endpoints

### 1. Retrieve Quests
- **Method**: `GET`
- **Route**: `/api/tasks`
- **Parameters**: `search`, `category`, `budgetMin`, `budgetMax`, `sortBy`, `status`
- **Response (200)**:
  ```json
  { "success": true, "tasks": [...] }
  ```

### 2. Post New Quest
- **Method**: `POST`
- **Route**: `/api/tasks`
- **Auth**: JWT Cookie Required
- **Body**:
  ```json
  {
    "title": "Help carry boxes to L Block",
    "description": "Moving blocks from hostel corridor.",
    "category": "HOSTEL_HELP",
    "offeredAmount": 150,
    "deadline": "2026-08-01T12:00:00Z",
    "location": "MENS_HOSTEL",
    "people_needed": 1,
    "assignment_mode": "first_come",
    "estimatedDuration": "MIN_30"
  }
  ```

---

## 🛠️ Administrative Operations

### 1. User Account Actions
- **Method**: `POST`
- **Route**: `/api/admin/users`
- **Auth**: JWT Cookie (ADMIN / SUPER_ADMIN)
- **Body**:
  ```json
  {
    "targetUserId": "uuid-here",
    "action": "SUSPEND_USER",
    "reason": "Administrative suspension: transaction dispute escalation."
  }
  ```
