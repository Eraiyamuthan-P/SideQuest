import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

// -------------------------------------------------------------
// NAVIGATION ICONS
// -------------------------------------------------------------

export const HomeIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

export const BrowseIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

export const CreateTaskIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

export const InboxIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

export const BellIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const LeaderboardIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
    <path d="M12 2a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4z" />
  </svg>
);

export const SavedIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
  </svg>
);

export const ProfileIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// -------------------------------------------------------------
// CATEGORY ICONS
// -------------------------------------------------------------

export const TutoringIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

export const FoodIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

export const RideIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="1" y="3" width="22" height="13" rx="2" ry="2" />
    <path d="M16 8h4M4 8h4M12 3v13M5 16v4M19 16v4" />
  </svg>
);

export const ParcelIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

export const ShoppingIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

export const CodingIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
    <line x1="14" y1="4" x2="10" y2="20" />
  </svg>
);

export const NotesIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

export const PrintingIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

export const HostelIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3v18M19 9l-7-6-7 6v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" />
  </svg>
);

export const EventIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// Helper function to resolve categories
export const getCategoryIcon = (category: string, size = 20) => {
  switch (category) {
    case 'TUTORING': return <TutoringIcon size={size} />;
    case 'FOOD_PICKUP': return <FoodIcon size={size} />;
    case 'RIDE_SHARING': return <RideIcon size={size} />;
    case 'PARCEL_DELIVERY': return <ParcelIcon size={size} />;
    case 'SHOPPING': return <ShoppingIcon size={size} />;
    case 'CODING_HELP': return <CodingIcon size={size} />;
    case 'NOTES': return <NotesIcon size={size} />;
    case 'PRINTING': return <PrintingIcon size={size} />;
    case 'HOSTEL_HELP': return <HostelIcon size={size} />;
    case 'EVENT_ASSISTANCE': return <EventIcon size={size} />;
    default: return <NotesIcon size={size} />;
  }
};

// -------------------------------------------------------------
// STATUS / REPUTATION ICONS
// -------------------------------------------------------------

export const StarIcon: React.FC<IconProps> = ({ size = 18, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const VerifiedIcon: React.FC<IconProps> = ({ size = 16, stroke = '#22C55E', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 11 2 2 4-4" />
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ size = 16, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const LocationIcon: React.FC<IconProps> = ({ size = 16, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const ApplicantsIcon: React.FC<IconProps> = ({ size = 16, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const ChatIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const AttachmentIcon: React.FC<IconProps> = ({ size = 18, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const FilterIcon: React.FC<IconProps> = ({ size = 20, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

// -------------------------------------------------------------
// NOTIFICATION ICONS
// -------------------------------------------------------------

export const BidNotificationIcon: React.FC<IconProps> = ({ size = 20, stroke = '#3B82F6', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

export const AssignmentNotificationIcon: React.FC<IconProps> = ({ size = 20, stroke = '#8B5CF6', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <polyline points="16 11 18 13 22 9" />
  </svg>
);

export const ChatNotificationIcon: React.FC<IconProps> = ({ size = 20, stroke = '#6366F1', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

export const CompletionNotificationIcon: React.FC<IconProps> = ({ size = 20, stroke = '#22C55E', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const ReviewNotificationIcon: React.FC<IconProps> = ({ size = 20, stroke = '#F59E0B', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const RejectionNotificationIcon: React.FC<IconProps> = ({ size = 20, stroke = '#EF4444', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

export const SystemNotificationIcon: React.FC<IconProps> = ({ size = 20, stroke = '#64748B', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

// Resolve Notification Type Icon
export const getNotificationIcon = (type: string, size = 20) => {
  switch (type) {
    case 'BID': return <BidNotificationIcon size={size} />;
    case 'ASSIGNMENT': return <AssignmentNotificationIcon size={size} />;
    case 'CHAT': return <ChatNotificationIcon size={size} />;
    case 'COMPLETION': return <CompletionNotificationIcon size={size} />;
    case 'REVIEW': return <ReviewNotificationIcon size={size} />;
    case 'REJECTION': return <RejectionNotificationIcon size={size} />;
    case 'SYSTEM': return <SystemNotificationIcon size={size} />;
    default: return <SystemNotificationIcon size={size} />;
  }
};

// -------------------------------------------------------------
// LOGO MARK
// -------------------------------------------------------------

export const SideQuestLogo: React.FC<IconProps> = ({ size = 24, stroke = 'currentColor', fill = 'none', ...props }) => {
  const isCustomColor = stroke !== 'currentColor';
  const strokeVal = isCustomColor ? stroke : 'url(#logoGrad)';
  const fillVal = isCustomColor ? (fill === 'none' ? 'none' : stroke) : 'url(#logoGrad)';

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      {/* Upper Diamond */}
      <path className="diamond-upper" d="M12 2L20 8L12 14L4 8Z" stroke={strokeVal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Lower Diamond */}
      <path className="diamond-lower" d="M12 10L20 16L12 22L4 16Z" fill={fillVal} fillOpacity={isCustomColor ? 0.4 : 0.8} stroke={strokeVal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// CUSTOM VECTOR WORDMARK
// -------------------------------------------------------------
export const SideQuestWordmark: React.FC<IconProps> = ({ size = 32, ...props }) => (
  <svg height={size} viewBox="0 0 135 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', verticalAlign: 'middle' }} {...props}>
    <defs>
      <linearGradient id="wordmarkLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--accent-primary)" />
        <stop offset="100%" stopColor="var(--accent-secondary)" />
      </linearGradient>
    </defs>

    {/* 1. Logo Mark - Double Diamond (scaled to fit wordmark) */}
    <g transform="translate(2, 1) scale(0.95)" stroke="url(#wordmarkLogoGrad)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      {/* Upper Diamond */}
      <path className="diamond-upper" d="M12 2L20 8L12 14L4 8Z" fill="none" />
      {/* Lower Diamond */}
      <path className="diamond-lower" d="M12 10L20 16L12 22L4 16Z" fill="url(#wordmarkLogoGrad)" fillOpacity="0.75" />
    </g>
    
    {/* 2. Text Lettering - "Side" in Bold White, "Quest" in Gradient, aligned tightly at x=28 */}
    {/* Custom 'S' */}
    <text x="29" y="19.5" fontFamily="'Space Grotesk', sans-serif" fontWeight="800" fontSize="17.5" fill="#ffffff" letterSpacing="-0.06em">S</text>
    {/* "ide" in Space Grotesk ExtraBold */}
    <text x="40.5" y="19.5" fontFamily="'Space Grotesk', sans-serif" fontWeight="800" fontSize="17.5" fill="#ffffff" letterSpacing="-0.06em">ide</text>

    {/* Custom 'Q' starting immediately at x=67 */}
    <path d="M66 11.5c0-4.0 3.0-7.2 7.0-7.2s7.0 3.2 7.0 7.2-3.0 7.2-7.0 7.2c-1.6 0-3.0-.5-4.2-1.5l1.3-1.3c.9.7 1.8 1.1 2.9 1.1 2.8 0 5.0-2.3 5.0-5.5s-2.2-5.5-5.0-5.5-5.0 2.3-5.0 5.5c0 1.0.3 2.0.9 2.8l-1.3 1.3c-.8-1.0-1.3-2.3-1.3-4.1z" fill="url(#wordmarkLogoGrad)" transform="translate(1, 0.5)" />
    <path d="M76 15.5l3.5 3.5" stroke="url(#wordmarkLogoGrad)" strokeWidth="2.5" strokeLinecap="round" transform="translate(1, 0.5)" />
    {/* 'uest' in Space Grotesk ExtraBold */}
    <text x="84" y="19.5" fontFamily="'Space Grotesk', sans-serif" fontWeight="800" fontSize="17.5" fill="url(#wordmarkLogoGrad)" letterSpacing="-0.06em">uest</text>
  </svg>
);


export const RewardIcon: React.FC<IconProps> = ({ size = 16, stroke = 'currentColor', fill = 'none', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="6" x2="12" y2="18" />
    <path d="M9.5 9H13.5a1.5 1.5 0 0 1 0 3H9.5a1.5 1.5 0 0 0 0 3H14.5" />
  </svg>
);
