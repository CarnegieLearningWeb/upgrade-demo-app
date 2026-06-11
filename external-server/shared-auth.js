const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const COOKIE_NAME = "external-app-session";
const SESSION_EXPIRY_MINUTES = 60;

function base64urlEncode(obj) {
    return Buffer.from(JSON.stringify(obj))
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

function base64urlDecode(str) {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    return Buffer.from(str, "base64").toString("utf8");
}

function computeSig(header, body, secret) {
    return crypto
        .createHmac("sha256", secret)
        .update(`${header}.${body}`)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

function signToken({ email, name }, secret) {
    const header = base64urlEncode({ alg: "HS256", typ: "JWT" });
    const payload = base64urlEncode({
        email,
        name,
        exp: Math.floor(Date.now() / 1000) + SESSION_EXPIRY_MINUTES * 60
    });
    const sig = computeSig(header, payload, secret);
    return `${header}.${payload}.${sig}`;
}

function verifyToken(token, secret) {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Malformed token");

    const [header, body, sig] = parts;
    const expectedSig = computeSig(header, body, secret);
    const actualBuffer = Buffer.from(sig);
    const expectedBuffer = Buffer.from(expectedSig);

    if (
        actualBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
        throw new Error("Invalid signature");
    }

    const payload = JSON.parse(base64urlDecode(body));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
        throw new Error("Token expired");
    }
    return payload;
}

function createSharedExternalAuth({ googleClientId, sessionSecret, mode }) {
    const client = new OAuth2Client(googleClientId);
    const secureCookie = mode === "PROD";

    const fail = ({ req, res, loginPath }) => {
        if (req.originalUrl.startsWith("/api/")) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        return res.redirect(loginPath);
    };

    const guard = ({ loginPath }) => (req, res, next) => {
        const token = req.cookies && req.cookies[COOKIE_NAME];
        if (!sessionSecret) {
            console.error("External app session secret is not configured");
            return fail({ req, res, loginPath });
        }
        if (!token) return fail({ req, res, loginPath });

        try {
            const payload = verifyToken(token, sessionSecret);
            req.externalAppUser = { email: payload.email, name: payload.name };
            return next();
        } catch (err) {
            res.clearCookie(COOKIE_NAME, { path: "/" });
            return fail({ req, res, loginPath });
        }
    };

    const gatePath = ({ loginPath, publicPaths }) => (req, res, next) => {
        if (publicPaths.includes(req.path)) return next();
        return guard({ loginPath })(req, res, next);
    };

    const apiGuard = (req, res, next) => {
        return guard({ loginPath: "/" })(req, res, next);
    };

    const loginHandler = ({ label }) => async (req, res) => {
        if (!sessionSecret) {
            return res.status(500).json({ error: "Server misconfigured: external app session secret not set" });
        }

        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ error: "Missing credential" });
        }

        let payload;
        try {
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: googleClientId
            });
            payload = ticket.getPayload();
        } catch (err) {
            return res.status(401).json({ error: "Invalid Google token" });
        }

        console.log(`[${label} login] email=${payload.email} verified=${payload.email_verified}`);

        if (!payload.email_verified) {
            return res.status(403).json({ error: "Google account must have a verified email" });
        }

        const token = signToken({ email: payload.email, name: payload.name }, sessionSecret);
        res.cookie(COOKIE_NAME, token, {
            httpOnly: true,
            sameSite: "lax",
            secure: secureCookie,
            path: "/",
            maxAge: SESSION_EXPIRY_MINUTES * 60 * 1000
        });
        return res.json({ ok: true });
    };

    return {
        apiGuard,
        gatePath,
        guard,
        loginHandler
    };
}

module.exports = { createSharedExternalAuth };
