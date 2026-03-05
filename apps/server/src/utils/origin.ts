export function getTrustedOrigin(origin: string): string {
  // 1. Allow Dev (Localhost with any port)
  if (!origin || origin.startsWith('http://localhost:')) {
    return origin
  }

  // 2. Allow Production (Exact Match)
  if (origin === 'https://airi.moeru.ai') {
    return origin
  }

  // 3. Allow Dynamic Subdomains (Strict Regex)
  // Matches: https://foo.kwaa.workers.dev
  if (/^https:\/\/.*\.kwaa\.workers\.dev$/.test(origin)) {
    return origin
  }

  // 4. Allow Vercel preview/production deployments
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
    return origin
  }

  // 5. Allow Railway deployments
  if (/^https:\/\/.*\.railway\.app$/.test(origin)) {
    return origin
  }

  // Default: Block
  return ''
}
