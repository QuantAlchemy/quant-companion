import { useId } from 'react'

export function LogoMark({
  size = 34,
  animated = true,
}: {
  size?: number
  /** The favicon uses the static source. In-app marks reveal the signal line. */
  animated?: boolean
}) {
  const id = useId().replace(/:/g, '')
  const violetId = `qc-violet-${id}`
  const goldId = `qc-gold-${id}`

  return (
    <svg
      aria-label="Quant Companion"
      className="inline-flex shrink-0"
      height={size}
      role="img"
      viewBox="0 0 64 64"
      width={size}
    >
      <defs>
        <linearGradient id={violetId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#B48CFF" />
          <stop offset="55%" stopColor="#7C5CFF" />
          <stop offset="100%" stopColor="#552EF0" />
        </linearGradient>
        <linearGradient id={goldId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F4CF87" />
          <stop offset="100%" stopColor="#E8B45A" />
        </linearGradient>
      </defs>
      <path
        d="M49 47.5A23 23 0 1 1 54.2 37"
        fill="none"
        stroke={`url(#${violetId})`}
        strokeLinecap="round"
        strokeWidth="7"
      />
      <path
        d="M37.5 40.5 53.5 55"
        fill="none"
        stroke={`url(#${violetId})`}
        strokeLinecap="round"
        strokeWidth="7"
      />
      <path
        className={animated ? 'logo-signal-line' : undefined}
        d="m17.5 36 9-8.5 7 6 12.5-14"
        fill="none"
        pathLength="1"
        stroke={`url(#${goldId})`}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.5"
      />
      <circle cx="46" cy="19.5" fill="#F4CF87" r="3.5" />
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-semibold tracking-tight ${className}`}>
      Quant{' '}
      <span className="bg-linear-to-r from-[#B48CFF] to-[#6D4FFF] bg-clip-text text-transparent">
        Companion
      </span>
    </span>
  )
}

export default function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <Wordmark className="text-xl" />
    </span>
  )
}
