import { useUser } from '@clerk/tanstack-react-start'
import { useEffect } from 'react'

import { isClerkClientConfigured } from '@/lib/clerk'
import { recordDailyVisit, setGamificationUser } from '@/lib/gamification'

/** Keeps the gamification store bound to the signed-in user (or guest). */
export default function GamificationBridge() {
  if (!isClerkClientConfigured()) return <GuestGamificationBridge />

  return <ClerkGamificationBridge />
}

function ClerkGamificationBridge() {
  const { isLoaded, user } = useUser()

  useEffect(() => {
    if (!isLoaded) return
    setGamificationUser(user?.id)
    recordDailyVisit()
  }, [isLoaded, user?.id])

  return null
}

function GuestGamificationBridge() {
  useEffect(() => {
    setGamificationUser(undefined)
    recordDailyVisit()
  }, [])

  return null
}
