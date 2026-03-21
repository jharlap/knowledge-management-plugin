// Copy this file to src/credentials.ts and fill in your own GCP OAuth credentials
// for local development. src/credentials.ts is gitignored.
//
// In CI, the release workflow generates src/credentials.ts from repository secrets
// GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
//
// To get credentials:
//   1. Create a GCP project at console.cloud.google.com
//   2. Enable the Drive API
//   3. Create an OAuth 2.0 "Desktop app" credential
//   4. Add the values below

export const GOOGLE_CLIENT_ID = '';
export const GOOGLE_CLIENT_SECRET = '';
