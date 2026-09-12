interface IconProps {
  className?: string;
}

const base = "shrink-0";

export function IconChevron({ className = "", open }: IconProps & { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={`${base} ${className} transition-transform duration-150 ${open ? "rotate-90" : ""}`}
      fill="none"
    >
      <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconFolder({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={`${base} ${className}`} fill="none">
      <path
        d="M2 4.5C2 3.67157 2.67157 3 3.5 3H6.5L8 4.5H12.5C13.3284 4.5 14 5.17157 14 6V11.5C14 12.3284 13.3284 13 12.5 13H3.5C2.67157 13 2 12.3284 2 11.5V4.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconFile({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={`${base} ${className}`} fill="none">
      <path
        d="M4 2.5H9L12 5.5V13C12 13.2761 11.7761 13.5 11.5 13.5H4.5C4.22386 13.5 4 13.2761 4 13V2.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M9 2.5V5.5H12" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function IconClose({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 12 12" className={`${base} ${className}`} fill="none">
      <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconDot({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 12 12" className={`${base} ${className}`} fill="currentColor">
      <circle cx="6" cy="6" r="3" />
    </svg>
  );
}

export function IconPlus({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 12 12" className={`${base} ${className}`} fill="none">
      <path d="M6 2.5V9.5M2.5 6H9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconFolderPlus({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={`${base} ${className}`} fill="none">
      <path
        d="M2 4.5C2 3.67157 2.67157 3 3.5 3H6.5L8 4.5H12.5C13.3284 4.5 14 5.17157 14 6V11.5C14 12.3284 13.3284 13 12.5 13H3.5C2.67157 13 2 12.3284 2 11.5V4.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M8 7.5V10.5M6.5 9H9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconPlay({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={`${base} ${className}`} fill="currentColor">
      <path d="M4.5 3.2C4.5 2.77 4.97 2.51 5.33 2.74L12.5 7.54C12.83 7.76 12.83 8.24 12.5 8.46L5.33 13.26C4.97 13.49 4.5 13.23 4.5 12.8V3.2Z" />
    </svg>
  );
}

export function IconTrash({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={`${base} ${className}`} fill="none">
      <path
        d="M3.5 4.5H12.5M6.5 4.5V3.2C6.5 2.87 6.77 2.6 7.1 2.6H8.9C9.23 2.6 9.5 2.87 9.5 3.2V4.5M6.5 7.3V11M9.5 7.3V11M4.3 4.5L4.8 12.4C4.83 12.88 5.23 13.25 5.71 13.25H10.29C10.77 13.25 11.17 12.88 11.2 12.4L11.7 4.5"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBack({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={`${base} ${className}`} fill="none">
      <path d="M9.5 3L5 8L9.5 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRefresh({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={`${base} ${className}`} fill="none">
      <path
        d="M13 8A5 5 0 1 1 11.5 4.3M13 8V4.5M13 8H9.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconPhone({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={`${base} ${className}`} fill="none">
      <rect x="5" y="1.5" width="6" height="13" rx="1.3" stroke="currentColor" strokeWidth="1.1" />
      <path d="M7 12.2H9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function IconTablet({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={`${base} ${className}`} fill="none">
      <rect x="3" y="1.5" width="10" height="13" rx="1.3" stroke="currentColor" strokeWidth="1.1" />
      <path d="M6.8 12.2H9.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function IconLaptop({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={`${base} ${className}`} fill="none">
      <rect x="2.5" y="2.5" width="11" height="7.5" rx="1" stroke="currentColor" strokeWidth="1.1" />
      <path d="M1 12.5H15" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
