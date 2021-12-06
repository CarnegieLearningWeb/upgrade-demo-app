const { OAuth2Client } = require("google-auth-library");
const config = require("./../config/config");
const User = require("./../models/user");
const asyncHandler = require("./async-handler");
const loggedInUser = require("./logged-in-user");
const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// A middleware to check if the user is authenticated by Google OAuth 2.0
const googleAuth = asyncHandler(async (req, res, next) => {
    // Verify the token
    const token = req.cookies["session-token"];
    let payload = null;
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });
        payload = ticket.getPayload();
    }
    catch (err) {
        throw { status: 401, message: "Failed to authorize the user, please log in" };
    }
    // Check if the user has signed up
    const user = await User.findOne({ email: payload.email });
    if (!user) {
        throw { status: 403, message: "The user has not signed up, please log in" };
    }
    // Log out the user if the session has expired
    const logoutUser = () => {
        res.clearCookie("session-token");
        throw { status: 401, message: "Your session has expired, please log in again" };
    }
    if (!loggedInUser.exists || loggedInUser.email !== user.email) {
        logoutUser();
    }
    const currentDate = new Date();
    const loginDurationSeconds = Math.round((currentDate - loggedInUser.loggedInDate) / 1000);
    const inactiveDurationSeconds = Math.round((currentDate - loggedInUser.lastActiveDate) / 1000);
    if (loginDurationSeconds > loggedInUser.maxLoginDurationSeconds ||
        inactiveDurationSeconds > loggedInUser.maxInactiveDurationSeconds) {
        loggedInUser.exists = false;
        logoutUser();
    }
    // Update the last active date
    loggedInUser.lastActiveDate = currentDate;

    // Proceed with the user's request
    req.user = user;
    next();
});

module.exports = googleAuth;