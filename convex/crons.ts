import { cronJobs } from 'convex/server'

import { internal } from './_generated/api'

const crons = cronJobs()

// Stop and target alerts. Hourly suits swing trades and keeps price calls low.
crons.hourly(
  'check stop and target levels',
  { minuteUTC: 5 },
  internal.alerts.checkLevels,
)

export default crons
