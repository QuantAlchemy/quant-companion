// Clerk is the identity provider. Create a JWT template named "convex" in the
// Clerk dashboard and set CLERK_JWT_ISSUER_DOMAIN on the Convex deployment:
// https://docs.convex.dev/auth/clerk
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: 'convex',
    },
  ],
}
