const policy = [
  "default-src 'self'",
  "script-src 'self' https://accounts.google.com/gsi/client",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: https://i.ytimg.com https://*.googleusercontent.com",
  "frame-src https://www.youtube-nocookie.com https://accounts.google.com/gsi/",
  "connect-src 'self' https://accounts.google.com/gsi/",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join("; ");

export function applySecurityHeaders(res) {
  res.setHeader("Content-Security-Policy", policy);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.removeHeader("X-Powered-By");
}
