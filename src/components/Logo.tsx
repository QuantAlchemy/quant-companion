const QA_MARK_PATH =
  'M17.49,63.75c-4.32-5.58-6.9-12.57-6.9-20.16,0-18.19,14.8-33,33-33s33,14.8,33,33c0,2.39-.26,4.72-.74,6.96l6.96,12.05c2.8-5.75,4.37-12.2,4.37-19.02C87.18,19.55,67.62,0,43.59,0S0,19.55,0,43.59s19.55,43.59,43.59,43.59c4.24,0,8.33-.61,12.21-1.74l-5.51-9.54c-2.17.45-4.41.68-6.7.68-6.69,0-12.93-2.01-18.13-5.45l18.04-31.25,27.3,47.29h12.23L43.5,18.7l-26.01,45.04Z'

export function LogoMark({
  size = 34,
  spark = true,
}: {
  size?: number
  spark?: boolean
}) {
  return (
    <span
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 87.18 87.18"
        width={size}
        height={size}
        role="img"
        aria-label="Quant Companion"
      >
        <defs>
          <linearGradient id="qc-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#B48CFF" />
            <stop offset="55%" stopColor="#7C5CFF" />
            <stop offset="100%" stopColor="#552EF0" />
          </linearGradient>
        </defs>
        <path fill="url(#qc-mark)" d={QA_MARK_PATH} />
      </svg>
      {spark && (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ animation: 'orbit 9s linear infinite' }}
        >
          <span
            className="absolute rounded-full"
            style={{
              width: size * 0.14,
              height: size * 0.14,
              top: -size * 0.02,
              left: '50%',
              marginLeft: -size * 0.07,
              background: 'radial-gradient(circle, #F4CF87 0%, #E8B45A 60%, transparent 100%)',
              boxShadow: '0 0 8px 2px rgba(232, 180, 90, 0.55)',
            }}
          />
        </span>
      )}
    </span>
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
