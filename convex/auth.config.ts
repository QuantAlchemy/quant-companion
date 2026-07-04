import type { AuthConfig } from 'convex/server'

declare const process: {
  env: {
    CLERK_JWT_ISSUER_DOMAIN?: string
  }
}

// Clerk is the identity provider. Create a JWT template named "convex" in the
// Clerk dashboard and set CLERK_JWT_ISSUER_DOMAIN on the Convex deployment:
// https://docs.convex.dev/auth/clerk
const clerkJwtIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN

if (!clerkJwtIssuerDomain) {
  throw new Error('CLERK_JWT_ISSUER_DOMAIN must be set for Convex Clerk auth')
}

export default {
  providers: [
    {
      domain: clerkJwtIssuerDomain,
      applicationID: 'convex',
    },
  ],
} satisfies AuthConfig
