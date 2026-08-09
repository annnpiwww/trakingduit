import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiting store (in-memory, production pakai Redis/Upstash)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Rate limit config per endpoint pattern
const RATE_LIMITS = {
  "/api/ocr/gemini": { maxRequests: 60, windowMs: 60000 }, // 60 req/min — AI OCR (gemma via OmniRoute)
  "/api/ocr": { maxRequests: 10, windowMs: 60000 }, // 10 req/min — Google Vision
  "/api/insight": { maxRequests: 5, windowMs: 60000 }, // 5 req/min
  "/api/sync/google-sheet": { maxRequests: 20, windowMs: 60000 }, // 20 req/min
  "/api/auth/login": { maxRequests: 5, windowMs: 300000 }, // 5 req/5min (brute force protection)
  "/api/tradu": { maxRequests: 20, windowMs: 60000 }, // 20 req/min — chat memakai LLM berbayar
  default: { maxRequests: 100, windowMs: 60000 }, // 100 req/min for others
};

// Check if Supabase is configured (production mode)
function isProductionMode(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Rate limiting check
function checkRateLimit(identifier: string, endpoint: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const limit = Object.entries(RATE_LIMITS).find(([pattern]) => endpoint.startsWith(pattern))?.[1] || RATE_LIMITS.default;

  const key = `${identifier}:${endpoint}`;
  const record = rateLimitStore.get(key);

  // Reset if window expired
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + limit.windowMs });
    return { allowed: true, remaining: limit.maxRequests - 1 };
  }

  // Check limit
  if (record.count >= limit.maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: limit.maxRequests - record.count };
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 300000);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only process API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip auth check for login endpoint
  if (pathname === "/api/auth/login") {
    // Only rate limiting for login
    const identifier = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimit = checkRateLimit(identifier, pathname);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "Retry-After": "300",
          },
        }
      );
    }

    return NextResponse.next();
  }

  // Protected API endpoints - require auth in production
  const protectedEndpoints = ["/api/ocr", "/api/insight", "/api/sync/google-sheet", "/api/analytics", "/api/transactions", "/api/tradu"];

  const isProtectedEndpoint = protectedEndpoints.some((endpoint) => pathname.startsWith(endpoint));

  if (isProtectedEndpoint && isProductionMode()) {
    // Check for auth token
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Token validation akan dilakukan di masing-masing route handler
    // Karena perlu Supabase client untuk verify token
    // Middleware hanya enforce bahwa token harus ada
  }

  // Rate limiting
  const identifier = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const rateLimit = checkRateLimit(identifier, pathname);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "Retry-After": "60",
        },
      }
    );
  }

  // Add rate limit headers
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
