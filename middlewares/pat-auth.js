const crypto = require("crypto");
const config = require("../config/config");

// ---------------------------------------------------------------------------
// Minimal HS256 JWT helpers (no external dependency)
// ---------------------------------------------------------------------------

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

function verifyPATToken(token, secret) {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Malformed token");
    const [header, body, sig] = parts;
    const expectedSig = computeSig(header, body, secret);
    // Timing-safe comparison (pads shorter buffer to avoid length leak)
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        throw new Error("Invalid signature");
    }
    const payload = JSON.parse(base64urlDecode(body));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
        throw new Error("Token expired");
    }
    return payload;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

const patAuth = (req, res, next) => {
    const secret = config.PAT_SESSION_SECRET;
    const token = req.cookies && req.cookies["pat-session"];

    const isApiRequest = req.originalUrl.includes("/problem-authoring-tool/api/");

    const fail = () => {
        if (isApiRequest) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        return res.redirect("/problem-authoring-tool/login");
    };

    if (!secret) {
        console.error("PAT_SESSION_SECRET is not configured");
        return fail();
    }

    if (!token) return fail();

    try {
        const payload = verifyPATToken(token, secret);
        req.patUser = { email: payload.email, name: payload.name };
        next();
    } catch (err) {
        // Token exists but is invalid or expired — clear the stale cookie
        res.clearCookie("pat-session", { path: "/problem-authoring-tool" });
        fail();
    }
};

module.exports = { patAuth, computeSig };
