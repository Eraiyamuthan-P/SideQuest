# Changelog

All notable changes to the SideQuest project will be documented in this file.

---

## [1.0.0] - 2026-07-25

### Added
- **Authentication**: Closed OTP-based signup and verification restricts registrations exclusively to approved `@vitstudent.ac.in` email handles. Added fallback Google Sign-In verification.
- **Marketplace**: Browse feed featuring location blocks (Men's Hostel, SJT, TT), category tags, offered rewards, counter-bidding options, and task creation panels.
- **Support & Disputes**: Ticket log form to report disputes. Admins can settle disputes favoring either Poster or Doer with automatic credit penalties.
- **Audit Logging**: Structured logger tracking `actorEmail`, `targetEmail`, detailed JSON `metadata` changes, and transaction `ipAddress`.
- **Keyboard Shortcuts**: Focus search with `/`, create a quest with `n`, or navigate with sequences.
- **PWA Capabilities**: Offline asset caching, responsive layouts, and homescreen launcher integrations.
- **Premium Styling System**: Glassmorphism cards, shimmers, transitions, and inline loaders.
