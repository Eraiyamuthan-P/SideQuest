# SideQuest Brand & Design Guide

This guide establishes the visual language, design system, and design tokens of SideQuest to preserve its premium SaaS appearance.

---

## 🎨 Color Tokens (Slate Dark Theme)

| Token | Hex Code | Utility |
| ----- | -------- | ------- |
| `--bg-primary` | `#0F172A` | Global background canvas |
| `--bg-secondary` | `#1E293B` | Sidebars, tables, and dialogs |
| `--accent-primary` | `#6366F1` | Indigo (Links, primary buttons, indicators) |
| `--accent-secondary` | `#8B5CF6` | Purple (Secondary tags, leaderboard scores) |
| `--success` | `#22C55E` | Green (Verified states, active user counts) |
| `--warning` | `#F59E0B` | Amber (Bidding counters, counter-bids) |
| `--danger` | `#EF4444` | Red (Urgent flags, suspensions, actions) |

---

## 🖋️ Typography

- **Display Headings**: `'Space Grotesk', sans-serif` (weight: 700, 800) for headers and card counters.
- **Body & Forms**: `'Manrope', sans-serif` (weight: 400, 500, 600, 700) for description listings and options.

---

## 🎬 Motion Tokens

```css
--motion-fast: 150ms;
--motion-normal: 220ms;
--motion-slow: 350ms;
--ease-default: cubic-bezier(.2, .8, .2, 1);
```

- **Transitions**: Apply `.route-entrance` on page containers:
  ```css
  @keyframes routeEntrance {
    from { opacity: 0; transform: translateY(12px); filter: blur(4px); }
    to { opacity: 1; transform: translateY(0); filter: blur(0); }
  }
  ```
