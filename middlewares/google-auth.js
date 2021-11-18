const { OAuth2Client } = require("google-auth-library");
const config = require("./../config/config");
const User = require("./../models/user");
const asyncHandler = require("./async-handler");
const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// A middleware to check if the user is authenticated by Google OAuth 2.0
const googleAuth = asyncHandler(async (req, res, next) => {
    req.loginRequired = true; // Used to redirect to the login page if any error occurs
    const token = req.cookies["session-token"];
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    // Check if the user has signed up
    const user = await User.findOne({ email: payload.email });
    if (!user) {
        throw { status: 403, message: "The user has not signed up" };
    }
    req.user = user;
    req.loginRequired = false;
    next();
});

module.exports = googleAuth;