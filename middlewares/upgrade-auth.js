const { GoogleAuth } = require("google-auth-library");
const config = require("../config/config");

const auth = new GoogleAuth({
  keyFilename: config.UPGRADE_SERVICE_ACCOUNT_KEY_PATH,
  scopes: "https://www.googleapis.com/auth/cloud-platform",
});

let authClient = null;
let cachedToken = null;

async function authenticateServiceAccount() {
  try {
    if (!authClient) {
        authClient = await auth.getClient();
    }
    if (cachedToken && !authClient.isTokenExpiring()) {
        return cachedToken;
    }
    const { token } = await authClient.getAccessToken();
    cachedToken = token;
    return token;
  } catch (error) {
    throw error;
  }
}

const upgradeAuth = async (req, res, next) => {
  try {
    const accessToken = await authenticateServiceAccount();
    req.upgradeToken = accessToken;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = upgradeAuth;