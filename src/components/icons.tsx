import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const LogoIcon = (props: IconProps) => (
  <svg {...base({ ...props, viewBox: "0 0 24 24" })}>
    <path d="M12 3l7 4v10l-7 4-7-4V7z" />
    <path d="M12 3v18M5 7l7 4 7-4" opacity="0.5" />
  </svg>
);

export const SearchIcon = (props: IconProps) => (
  <svg {...base({ ...props, width: 14, height: 14 })}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

export const OverviewIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 13h7V4H4zM13 20h7v-9h-7zM13 4v4h7V4zM4 20h7v-4H4z" />
  </svg>
);

export const AgentsIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
  </svg>
);

export const SessionsIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M12 7v5l3.4 2" />
  </svg>
);

export const RisksIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 3l9 16H3z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);

export const TraceIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 6h10M4 12h16M4 18h7" />
    <circle cx="18" cy="6" r="2" />
    <circle cx="14" cy="18" r="2" />
  </svg>
);

export const CubeIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z" />
    <path d="M4 7.4l8 4.6 8-4.6M12 12v9.2" opacity="0.6" />
  </svg>
);

export const ExpandIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);

export const SlidersIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 8h10M18 8h2M4 16h2M10 16h10" />
    <circle cx="16" cy="8" r="2" />
    <circle cx="8" cy="16" r="2" />
  </svg>
);

export const LockIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const LogoutIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="M9 12h11M16 8l4 4-4 4" />
  </svg>
);
