function hasValue(value: string | undefined) {
  return typeof value === 'string' && value.length > 0
}

export function isClerkClientConfigured() {
  return hasValue(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)
}

export function isClerkServerConfigured() {
  return (
    isClerkClientConfigured() &&
    typeof process !== 'undefined' &&
    hasValue(process.env.CLERK_SECRET_KEY)
  )
}
