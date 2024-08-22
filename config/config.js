require("dotenv").config();
module.exports = {
    PORT: process.env.PORT || 8080,
    MONGODB_URI: process.env.MONGODB_URI || "",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
    UPGRADE_HOST_URL: process.env.UPGRADE_HOST_URL || "",
    UPGRADE_BASE_URL: process.env.UPGRADE_BASE_URL || "",
    UPGRADE_CONTEXT: process.env.UPGRADE_CONTEXT || "",
    UPGRADE_SERVICE_ACCOUNT_KEY_PATH: process.env.UPGRADE_SERVICE_ACCOUNT_KEY_PATH || "",
    IS_PRODUCTION: process.env.IS_PRODUCTION || "NO"
};