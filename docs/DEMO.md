# SideQuest Demo Flow Guide

This document maps out a structured walkthrough sequence to test, record, or showcase the SideQuest marketplace capabilities.

---

## 📽️ Suggested Walkthrough Script

### 1. Landing & Browsing Page
- Open `http://localhost:3000/`.
- Inspect the Hero banner, the active statistics display, and the "How it Works" guide blocks.
- Try searching for quests in the search input or sorting by highest/lowest budget.

### 2. Student Authentication
- Click **Post a Quest** or **Sign In**.
- Enter a mock student address: `student1@vitstudent.ac.in`.
- Submit and input the verification code (look inside console output of the server task log where OTP is printed).
- Success! You are signed in.

### 3. Quest Posting
- Navigate to `/tasks/new`.
- Input Quest details:
  - Title: "Help move study guides to TT Block"
  - Location: `TT`
  - Offered Amount: `150`
  - Deadline: Set 3 days in the future.
- Click **Create SideQuest**.
- The quest appears immediately on the browsing board!

### 4. Admin Panel & Status
- Sign out and log in as `vit_admin` (the system administrator account, or the platform owner `eraiyamuthan.p2023@vitstudent.ac.in`).
- Navigate to `/admin`.
- Inspect active student directories, co-admin logs, support tickets, and live connectivity latency diagnostics.
