# SideQuest Product Roadmap

This document outlines completed milestones and planned enhancements for the SideQuest platform.

---

## 🟩 Phase 1: Core Errand Marketplace (Completed)
- Hyperlocal quest browsing feed with campus location blocks (SJT, TT, Hostels).
- Student assignment modes (First-come-first-serve vs Counter-bids selector).
- Core bidding workflow and profile transaction views.

## 🟩 Phase 2: Peer Reviews & Notifications (Completed)
- Post-completion double-blind peer rating reviews.
- 24-hour review editing grace window constraints.
- Real-time inbox and system alert notifications.

## 🟩 Phase 3: Security & Session Revocation (Completed)
- Account status states: `ACTIVE`, `SUSPENDED` (read-only), and `BANNED` (login blocked).
- Soft-delete tracking that hides user records while preserving historical logs.
- Automatic stale token invalidation using database-synchronized session versions.
- Extended audit logging with metadata payloads and IP logging.

## 🟩 Phase 4: UI Refinement & PWA Support (Completed)
- Fluid page transitions, shimmers, and Toast stack notifications.
- Local keyboard navigation hotkeys.
- Dynamic offline sitemaps and manifest resources.

## 🟨 Phase 5: Version 1.1 Enhancements (Planned)
- Real-time WebSocket connection channels for messaging.
- Campus map view routing integration for locating task hotspots.
- Multi-factor authentication support.
