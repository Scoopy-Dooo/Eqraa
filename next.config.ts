import type { NextConfig } from "next";
// Strict-ish CSP: no inline scripts beyond Next's own hydration bootstrap, no third-party origins.
// Same-origin only (no CORS headers are set anywhere), and cookies are SameSite=Lax, so cross-site
// state-changing requests can't carry the session cookie — this is our CSRF defence (BR-43).
const csp = [
  "default-src 'self'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:", "font-src 'self' data:", "connect-src 'self'",
  "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'",
].join("; ");
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];
const nextConfig: NextConfig = { async headers() { return [{ source: "/(.*)", headers: securityHeaders }]; } };
export default nextConfig;
