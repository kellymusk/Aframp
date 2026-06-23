import { cn } from '@/lib/utils'

const illustrationClass = 'h-auto w-full max-w-[200px]'

export function TransactionsEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(illustrationClass, className)}
      aria-hidden="true"
    >
      <rect x="40" y="24" width="120" height="88" rx="12" className="fill-muted stroke-border" strokeWidth="2" />
      <path
        d="M56 48h88M56 68h60M56 88h72"
        className="stroke-muted-foreground/40"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="148" cy="48" r="20" className="fill-primary/15 stroke-primary/40" strokeWidth="2" />
      <path
        d="M140 48h16M148 40v16"
        className="stroke-primary"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M88 112c0 8 6 14 12 14s12-6 12-14"
        className="stroke-primary/50"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse cx="100" cy="132" rx="36" ry="6" className="fill-muted-foreground/10" />
    </svg>
  )
}

export function BillsEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(illustrationClass, className)}
      aria-hidden="true"
    >
      <rect x="52" y="20" width="96" height="120" rx="10" className="fill-muted stroke-border" strokeWidth="2" />
      <path d="M68 44h64M68 64h48M68 84h56" className="stroke-muted-foreground/35" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M100 104l-8 16h16l-8-16z"
        className="fill-primary/20 stroke-primary"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="148" cy="52" r="22" className="fill-emerald-500/15 stroke-emerald-600/50 dark:stroke-emerald-400/50" strokeWidth="2" />
      <path
        d="M148 40v24M136 52h24"
        className="stroke-emerald-600 dark:stroke-emerald-400"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse cx="100" cy="148" rx="40" ry="6" className="fill-muted-foreground/10" />
    </svg>
  )
}

export function SearchEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(illustrationClass, className)}
      aria-hidden="true"
    >
      <circle cx="88" cy="72" r="36" className="stroke-border fill-muted/50" strokeWidth="3" />
      <path d="M114 98l28 28" className="stroke-primary" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M72 72h32M88 56v32"
        className="stroke-muted-foreground/30"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <ellipse cx="100" cy="140" rx="32" ry="5" className="fill-muted-foreground/10" />
    </svg>
  )
}

export function ScheduledEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(illustrationClass, className)}
      aria-hidden="true"
    >
      <rect x="48" y="28" width="104" height="96" rx="12" className="fill-muted stroke-border" strokeWidth="2" />
      <rect x="48" y="28" width="104" height="28" rx="12" className="fill-primary/10" />
      <circle cx="68" cy="42" r="4" className="fill-primary/40" />
      <circle cx="80" cy="42" r="4" className="fill-primary/40" />
      <circle cx="92" cy="42" r="4" className="fill-primary/40" />
      <path
        d="M68 72h64M68 88h48M68 104h56"
        className="stroke-muted-foreground/35"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M132 108l12 12 20-20"
        className="stroke-emerald-600 dark:stroke-emerald-400"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="100" cy="140" rx="36" ry="6" className="fill-muted-foreground/10" />
    </svg>
  )
}

export function FilterEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(illustrationClass, className)}
      aria-hidden="true"
    >
      <path
        d="M52 44h96l-32 40v36l-32-16V84L52 44z"
        className="fill-muted stroke-border"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M76 84h48" className="stroke-muted-foreground/40" strokeWidth="3" strokeLinecap="round" />
      <circle cx="140" cy="116" r="20" className="fill-primary/15 stroke-primary/50" strokeWidth="2" />
      <path d="M132 116h16" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="100" cy="140" rx="36" ry="6" className="fill-muted-foreground/10" />
    </svg>
  )
}
