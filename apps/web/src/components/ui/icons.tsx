import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function BaseIcon({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.15}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export type NavIconName =
  | "dashboard"
  | "users"
  | "software"
  | "patches"
  | "security-inventory"
  | "devices"
  | "deployment-plans"
  | "tickets"
  | "notifications"
  | "reports"
  | "policies"
  | "audit-logs";

export function NavModuleIcon({ name, size = 18, ...props }: IconProps & { name: NavIconName }) {
  switch (name) {
    case "dashboard":
      return (
        <BaseIcon size={size} {...props}>
          <rect x="3" y="3" width="7.5" height="7.5" rx="2.2" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2" />
        </BaseIcon>
      );
    case "users":
      return (
        <BaseIcon size={size} {...props}>
          <circle cx="9.5" cy="7.5" r="3.5" />
          <path d="M3.5 19.5c0-3.1 2.7-5.5 6-5.5s6 2.4 6 5.5" />
          <path d="M16.5 4.5a3.3 3.3 0 0 1 0 6.2" />
          <path d="M18.2 14.4c1.6.7 2.8 2.2 2.8 4.6" />
        </BaseIcon>
      );
    case "software":
      return (
        <BaseIcon size={size} {...props}>
          <path d="M12 2.8 20 7.2v9.6l-8 4.4-8-4.4V7.2L12 2.8Z" />
          <path d="M4.2 7.4 12 11.8l7.8-4.4" />
          <path d="M12 11.8v9.4" />
        </BaseIcon>
      );
    case "patches":
      return (
        <BaseIcon size={size} {...props}>
          <path d="M12 3 5 6v5.6c0 4.6 3 8.5 7 9.9 4-1.4 7-5.3 7-9.9V6l-7-3Z" />
          <path d="M12 8.5v5.5" />
          <path d="m9.5 11.8 2.5 2.5 2.5-2.5" />
        </BaseIcon>
      );
    case "security-inventory":
      return (
        <BaseIcon size={size} {...props}>
          <path d="M12 3 5 6v5.6c0 4.6 3 8.5 7 9.9 4-1.4 7-5.3 7-9.9V6l-7-3Z" />
          <path d="M12 8.5v4.2" />
          <circle cx="12" cy="16" r="0.6" fill="currentColor" />
        </BaseIcon>
      );
    case "devices":
      return (
        <BaseIcon size={size} {...props}>
          <rect x="3" y="4" width="18" height="12.5" rx="2.6" />
          <path d="M8.5 20.5h7" />
          <path d="M12 16.5v4" />
        </BaseIcon>
      );
    case "deployment-plans":
      return (
        <BaseIcon size={size} {...props}>
          <rect x="3.5" y="4.5" width="17" height="16" rx="2.8" />
          <path d="M8 3v3" />
          <path d="M16 3v3" />
          <path d="M3.5 9.5h17" />
          <path d="m9.5 14.8 1.9 1.9 3.6-3.7" />
        </BaseIcon>
      );
    case "tickets":
      return (
        <BaseIcon size={size} {...props}>
          <path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v6.2a2.5 2.5 0 0 1-2.5 2.5h-4.6l-3.9 3.3v-3.3H7a2.5 2.5 0 0 1-2.5-2.5V6.5Z" />
          <path d="M8.5 8.5h7" />
          <path d="M8.5 11.8h4.5" />
        </BaseIcon>
      );
    case "notifications":
      return (
        <BaseIcon size={size} {...props}>
          <path d="M6.5 9.8a5.5 5.5 0 0 1 11 0c0 4.5 1.8 6 1.8 6H4.7s1.8-1.5 1.8-6Z" />
          <path d="M10 19a2.2 2.2 0 0 0 4 0" />
        </BaseIcon>
      );
    case "reports":
      return (
        <BaseIcon size={size} {...props}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
          <path d="M8 16v-3.5" />
          <path d="M12 16V8.5" />
          <path d="M16 16v-5.5" />
        </BaseIcon>
      );
    case "policies":
      return (
        <BaseIcon size={size} {...props}>
          <path d="M4 7h9" />
          <path d="M17 7h3" />
          <circle cx="15" cy="7" r="2.2" />
          <path d="M4 17h3" />
          <path d="M11 17h9" />
          <circle cx="9" cy="17" r="2.2" />
        </BaseIcon>
      );
    case "audit-logs":
      return (
        <BaseIcon size={size} {...props}>
          <rect x="4" y="3.5" width="16" height="17" rx="2.8" />
          <path d="M8.5 8.5h7" />
          <path d="M8.5 12.2h7" />
          <path d="M8.5 15.9h4.5" />
        </BaseIcon>
      );
  }
}

export function BrandSyncIcon({ size = 20, ...props }: IconProps) {
  return (
    <BaseIcon size={size} {...props}>
      <path d="M20 11a8 8 0 0 0-14.4-4.7L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.4 4.7L20 16" />
      <path d="M20 20v-4h-4" />
    </BaseIcon>
  );
}

export function SearchIcon({ size = 15, ...props }: IconProps) {
  return (
    <BaseIcon size={size} {...props}>
      <circle cx="11" cy="11" r="6.8" />
      <path d="m16.2 16.2 4.1 4.1" />
    </BaseIcon>
  );
}

export function AppGridIcon({ size = 18, ...props }: IconProps) {
  return (
    <BaseIcon size={size} {...props}>
      <circle cx="6.5" cy="6.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="6.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="6.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="17.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="17.5" r="1.4" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}

export function MenuIcon({ size = 18, ...props }: IconProps) {
  return (
    <BaseIcon size={size} {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </BaseIcon>
  );
}

export function ChevronRightIcon({ size = 13, ...props }: IconProps) {
  return (
    <BaseIcon size={size} {...props}>
      <path d="m9 6 6 6-6 6" />
    </BaseIcon>
  );
}

export function UserProfileIcon({ size = 16, ...props }: IconProps) {
  return (
    <BaseIcon size={size} {...props}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 19.5c0-3.3 3.1-5.7 7-5.7s7 2.4 7 5.7" />
    </BaseIcon>
  );
}

export function LogOutIcon({ size = 16, ...props }: IconProps) {
  return (
    <BaseIcon size={size} {...props}>
      <path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10" />
      <path d="M15 16l4-4-4-4" />
      <path d="M19 12H9" />
    </BaseIcon>
  );
}

export function InfoCircleIcon({ size = 18, ...props }: IconProps) {
  return (
    <BaseIcon size={size} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.2v4.6" />
      <circle cx="12" cy="8" r="0.6" fill="currentColor" />
    </BaseIcon>
  );
}

export function PlusIcon({ size = 15, ...props }: IconProps) {
  return (
    <BaseIcon size={size} {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </BaseIcon>
  );
}

export function EditIcon({ size = 15, ...props }: IconProps) {
  return (
    <BaseIcon size={size} {...props}>
      <path d="M15.8 4.6a2.1 2.1 0 0 1 3 3L8.3 18.1 4 19.2l1.1-4.3L15.8 4.6Z" />
    </BaseIcon>
  );
}

export function TrashIcon({ size = 15, ...props }: IconProps) {
  return (
    <BaseIcon size={size} {...props}>
      <path d="M4.5 6.8h15" />
      <path d="M9.2 6.8V5a1.5 1.5 0 0 1 1.5-1.5h2.6A1.5 1.5 0 0 1 14.8 5v1.8" />
      <path d="M6.8 6.8 7.6 19a2 2 0 0 0 2 1.8h4.8a2 2 0 0 0 2-1.8l.8-12.2" />
    </BaseIcon>
  );
}

export function CloseIcon({ size = 18, ...props }: IconProps) {
  return (
    <BaseIcon size={size} {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </BaseIcon>
  );
}
