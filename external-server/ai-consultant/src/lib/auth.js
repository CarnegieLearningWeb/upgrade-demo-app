import crypto from 'node:crypto'
import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { renderLoginPage } from './login-page.js'

export const DEFAULT_SESSION_COOKIE_NAME = 'app-session'
const SESSION_EXPIRY_MINUTES = 60

function base64urlEncode(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return Buffer.from(str, 'base64').toString('utf8')
}

function computeSig(header, body, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function signToken({ email, name }, secret) {
  const header = base64urlEncode({ alg: 'HS256', typ: 'JWT' })
  const payload = base64urlEncode({
    email,
    name,
    exp: Math.floor(Date.now() / 1000) + SESSION_EXPIRY_MINUTES * 60,
  })
  const sig = computeSig(header, payload, secret)
  return `${header}.${payload}.${sig}`
}

function verifyToken(token, secret) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Malformed token')

  const [header, body, sig] = parts
  const expectedSig = computeSig(header, body, secret)
  const actualBuffer = Buffer.from(sig)
  const expectedBuffer = Buffer.from(expectedSig)

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid signature')
  }

  const payload = JSON.parse(base64urlDecode(body))
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error('Token expired')
  }
  return payload
}

function isApiRequest(req) {
  return req.originalUrl.startsWith('/api/') || req.path.startsWith('/api/')
}

function unauthorizedBody() {
  return { error: { code: 'unauthorized', message: 'Unauthorized' } }
}

export function createAppAuth({
  googleClientId = process.env.GOOGLE_CLIENT_ID,
  sessionSecret = process.env.SESSION_SECRET,
  sessionCookieName = process.env.SESSION_COOKIE_NAME || DEFAULT_SESSION_COOKIE_NAME,
  mode = process.env.MODE,
  label = 'app',
} = {}) {
  const client = new OAuth2Client(googleClientId)
  const secureCookie = mode === 'PROD' || process.env.NODE_ENV === 'production'

  const clearSession = (res) => {
    res.clearCookie(sessionCookieName, { path: '/' })
  }

  const fail = ({ req, res, loginPath }) => {
    if (isApiRequest(req)) {
      return res.status(401).json(unauthorizedBody())
    }
    return res.redirect(loginPath)
  }

  const readSession = (req) => {
    const token = req.cookies && req.cookies[sessionCookieName]
    if (!sessionSecret || !token) return null
    return verifyToken(token, sessionSecret)
  }

  const guard = ({ loginPath }) => (req, res, next) => {
    if (!sessionSecret) {
      console.error('App session secret is not configured')
      return fail({ req, res, loginPath })
    }

    try {
      const payload = readSession(req)
      if (!payload) return fail({ req, res, loginPath })
      req.appUser = { email: payload.email, name: payload.name }
      return next()
    } catch {
      clearSession(res)
      return fail({ req, res, loginPath })
    }
  }

  const gatePath = ({ loginPath, publicPaths }) => (req, res, next) => {
    if (publicPaths.includes(req.path)) return next()
    return guard({ loginPath })(req, res, next)
  }

  const apiGuard = (req, res, next) => {
    return guard({ loginPath: '/' })(req, res, next)
  }

  const sessionHandler = (req, res) => {
    try {
      const payload = readSession(req)
      if (!payload) return res.status(401).json({ authenticated: false })
      return res.json({
        authenticated: true,
        user: { email: payload.email, name: payload.name },
      })
    } catch {
      clearSession(res)
      return res.status(401).json({ authenticated: false })
    }
  }

  const loginHandler = async (req, res) => {
    if (!sessionSecret) {
      return res.status(500).json({
        error: { code: 'server_misconfigured', message: 'Server misconfigured: session secret not set' },
      })
    }

    const { credential } = req.body
    if (!credential) {
      return res.status(400).json({ error: { code: 'missing_credential', message: 'Missing credential' } })
    }

    let payload
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      })
      payload = ticket.getPayload()
    } catch {
      return res.status(401).json({ error: { code: 'invalid_google_token', message: 'Invalid Google token' } })
    }

    console.log(`[${label} login] email=${payload.email} verified=${payload.email_verified}`)

    if (!payload.email_verified) {
      return res.status(403).json({
        error: { code: 'email_not_verified', message: 'Google account must have a verified email' },
      })
    }

    const token = signToken({ email: payload.email, name: payload.name }, sessionSecret)
    res.cookie(sessionCookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookie,
      path: '/',
      maxAge: SESSION_EXPIRY_MINUTES * 60 * 1000,
    })
    return res.json({ ok: true })
  }

  const logoutHandler = (_req, res) => {
    clearSession(res)
    return res.json({ ok: true })
  }

  return {
    apiGuard,
    gatePath,
    guard,
    loginHandler,
    logoutHandler,
    sessionHandler,
  }
}

export function createAuthRouter({
  auth,
  basePath,
  googleClientId = process.env.GOOGLE_CLIENT_ID,
} = {}) {
  const router = Router()

  router.get('/login', (_req, res) => {
    res.type('html').send(renderLoginPage({ googleClientId, appBase: basePath }))
  })
  router.post('/api/login', auth.loginHandler)
  router.get('/api/session', auth.sessionHandler)
  router.post('/api/logout', auth.logoutHandler)

  return router
}
