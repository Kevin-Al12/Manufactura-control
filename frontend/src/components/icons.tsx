import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 17,
  height: 17,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconGrid(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="18" cy="8.5" r="2.6" />
      <path d="M15.8 14.3c2.9.4 5.2 2.5 5.2 5.7" />
    </svg>
  );
}

export function IconBolt(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12.5 2.5 4 14h6l-1.5 7.5L20 10h-6l-1.5-7.5Z" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.86 2.86l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V19.6a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.86-2.86l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H2.4a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.86-2.86l.06.06a1.7 1.7 0 0 0 1.87.34H8.5a1.7 1.7 0 0 0 1-1.55V2.4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.86 2.86l-.06.06a1.7 1.7 0 0 0-.34 1.87V8.5a1.7 1.7 0 0 0 1.55 1h.09a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
    </svg>
  );
}

export function IconInbox(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 12.5 5.8 4h12.4L21 12.5" />
      <path d="M3 12.5v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6h-5.2a1 1 0 0 0-.95.68l-.4 1.2a1 1 0 0 1-.95.68H10.5a1 1 0 0 1-.95-.68l-.4-1.2a1 1 0 0 0-.95-.68H3Z" />
    </svg>
  );
}

export function IconTotal(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 19V10M4 10 12 4l8 6M4 10h16M20 10v9M4 19h16" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m4 12.5 5.2 5.5L20 6" />
    </svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4" />
      <path d="M12 17.5v.1" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function IconTarget(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function IconFactory(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 21V10l5 3.5V10l5 3.5V10l5 3.5V21H3Z" />
      <path d="M3 21h18" />
      <path d="M7 21v-4M12 21v-4M17 21v-4" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...base} {...props} fill="currentColor" stroke="none">
      <path d="M7 4.5v15l13-7.5-13-7.5Z" />
    </svg>
  );
}

export function IconStop(props: IconProps) {
  return (
    <svg {...base} {...props} fill="currentColor" stroke="none">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export function IconGear(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 8v1.5M12 14.5V16M8 12h1.5M14.5 12H16M9.5 9.5l1 1M13.5 13.5l1 1M14.5 9.5l-1 1M9.5 14.5l1-1" />
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconBox(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m3.5 7 8.5-4.5L20.5 7 12 11.5 3.5 7Z" />
      <path d="M3.5 7v10l8.5 4.5V11.5" />
      <path d="M20.5 7v10L12 21.5" />
      <path d="M7.5 4.75 16 9.25" />
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="m16 8 4 4-4 4" />
      <path d="M20 12H9" />
    </svg>
  );
}

export function IconLogo(props: IconProps) {
  return (
    <svg {...base} strokeWidth={2.4} {...props}>
      <path d="M4 16.5 9 11l4 4 7-8" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
      <path d="M15.5 5.5v-.5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8.5a2 2 0 0 0 2 2h.5" />
    </svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
      <path d="M4 3.5V8h4.5" />
      <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
      <path d="M20 20.5V16h-4.5" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}
