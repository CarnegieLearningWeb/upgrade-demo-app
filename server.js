const express = require("express");
const cookieParser = require("cookie-parser");
const favicon = require("serve-favicon");
const axios = require("axios");
const mongoose = require("mongoose");
const { OAuth2Client } = require("google-auth-library");
const path = require("path");
const config = require("./config/config");
const klasses = require("./data/klasses");
const problems = require("./data/problems");
const introMessage = require("./data/intro-message");
const outroMessage = require("./data/outro-message");
const tours = require("./data/tours");
const User = require("./models/user");
const Klass = require("./models/klass");
const Student = require("./models/student");
const Session = require("./models/session");
const Log = require("./models/log");
const asyncHandler = require("./middlewares/async-handler");
const googleAuth = require("./middlewares/google-auth");
const upgradeAuth = require("./middlewares/upgrade-auth");
const loggedInUser = require("./middlewares/logged-in-user");
const { patAuth, computeSig } = require("./middlewares/pat-auth");
const Anthropic = require("@anthropic-ai/sdk").default;
const { TOOLS } = require("./tools");
const { SYSTEM_PROMPT } = require("./prompt");
const app = express();

// Config Settings
const PORT = config.PORT;
const MODE = config.MODE;
const MONGODB_URI = config.MONGODB_URI;
const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);
const UPGRADE_HOST_URL = config.UPGRADE_HOST_URL;
const UPGRADE_BASE_URL = config.UPGRADE_BASE_URL;
const UPGRADE_CONTEXT = config.UPGRADE_CONTEXT;

// DeprecationWarning: Mongoose: the `strictQuery` option will be switched back to `false` by default in Mongoose 7. Use `mongoose.set('strictQuery', false);` if you want to prepare for this change. Or use `mongoose.set('strictQuery', true);` to suppress this warning.
mongoose.set("strictQuery", false);

// Database connection
const connectDatabase = async () => {
    mongoose.Promise = global.Promise;
    await mongoose.connect(MONGODB_URI);
    console.log("Database is connected");
}

// Connect database
(async () => {
    await connectDatabase();
})().catch((err) => {
    console.error(`${err.name}: ${err.message}`);
    process.exit();
});

// Set view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// This has to do with "proxy_set_header X-Forwarded-For $remote_addr;" in nginx config file (/etc/nginx/sites-available/default)
app.set("trust proxy", true);

// Set middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(favicon(path.join(__dirname, "public/asset/favicon/favicon.ico")));

// PAT auth gate — must run before express.static("public") so files under
// public/problem-authoring-tool/ are not served without a valid session.
const PAT_PUBLIC_PATHS = ["/login", "/login.html", "/api/login"];
app.use("/problem-authoring-tool", (req, res, next) => {
    if (PAT_PUBLIC_PATHS.includes(req.path)) return next();
    patAuth(req, res, next);
});

// Set static server
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "views")));

// Create an axios instance for Upgrade API requests
const upgradeApiClient = axios.create({
    baseURL: process.env.IS_DOCKER && UPGRADE_HOST_URL.includes("localhost")
        ? UPGRADE_HOST_URL.replace("localhost", "host.docker.internal")
        : UPGRADE_HOST_URL,
    headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
});

/* ==================== Health Check ==================== */

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "upgrade-demo-app"
    });
});

/* ==================== Login/Home ==================== */

// Root Page
app.get("/", asyncHandler(async (req, res) => {
    res.redirect("/home");
}));

// Root redirect (for backwards compatibility)
app.get("/", asyncHandler(async (req, res) => {
    res.redirect("/home");
}));

// Login Page
app.get("/login", asyncHandler(async (req, res) => {
    res.render("login", { googleClientId: GOOGLE_CLIENT_ID, upgradeContext: UPGRADE_CONTEXT });
}));

// Home Page
app.get("/home", googleAuth, asyncHandler(async (req, res) => {
    res.render("home", { upgradeHostUrl: UPGRADE_HOST_URL, upgradeBaseUrl: UPGRADE_BASE_URL, upgradeContext: UPGRADE_CONTEXT, tours });
}));

// Download experiment file
app.get("/file/experiment/:filename", googleAuth, asyncHandler(async (req, res) => {
    res.download(path.join(__dirname, `public/asset/experiment/${req.params.filename}`));
}));

/* ==================== Problem Authoring Tool ==================== */

const PAT_SESSION_EXPIRY_MINUTES = 60; // change to 2 for quick expiry testing

// Helper: build a signed HS256 JWT for a PAT session
function signPATToken(email, name) {
    const secret = config.PAT_SESSION_SECRET;
    const b64url = (obj) =>
        Buffer.from(JSON.stringify(obj))
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=/g, "");
    const header = b64url({ alg: "HS256", typ: "JWT" });
    const payload = b64url({
        email,
        name,
        exp: Math.floor(Date.now() / 1000) + PAT_SESSION_EXPIRY_MINUTES * 60
    });
    const sig = computeSig(header, payload, secret);
    return `${header}.${payload}.${sig}`;
}

// Login page — public
app.get("/problem-authoring-tool/login", (req, res) => {
    res.render("problem-authoring-tool/login", { googleClientId: GOOGLE_CLIENT_ID });
});

// Login API — public
app.post("/problem-authoring-tool/api/login", asyncHandler(async (req, res) => {
    if (!config.PAT_SESSION_SECRET) {
        return res.status(500).json({ error: "Server misconfigured: PAT_SESSION_SECRET not set" });
    }
    const { credential } = req.body;
    if (!credential) {
        return res.status(400).json({ error: "Missing credential" });
    }
    // Verify Google ID token
    let payload;
    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });
        payload = ticket.getPayload();
    } catch (err) {
        return res.status(401).json({ error: "Invalid Google token" });
    }
    console.log(`[PAT login] email=${payload.email} verified=${payload.email_verified}`);
    // Require a verified Google account
    if (!payload.email_verified) {
        return res.status(403).json({ error: "Google account must have a verified email" });
    }
    // Restrict to verified @carnegielearning.com accounts
    if (!payload.email.endsWith("@carnegielearning.com")) {
        return res.status(403).json({ error: "Access restricted to @carnegielearning.com accounts" });
    }
    // Issue session cookie
    const token = signPATToken(payload.email, payload.name);
    res.cookie("pat-session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: config.MODE === "PROD",
        path: "/problem-authoring-tool",
        maxAge: PAT_SESSION_EXPIRY_MINUTES * 60 * 1000
    });
    res.json({ ok: true });
}));

// Redirect bare path → trailing slash (must be protected; auth gate already ran)
app.get("/problem-authoring-tool", (req, res) => {
    res.redirect("/problem-authoring-tool/");
});

// Protected static files
app.use(
    "/problem-authoring-tool",
    express.static(path.join(__dirname, "public/problem-authoring-tool"))
);

/* ==================== QuizApp ==================== */

// Login Page
app.get("/quiz-app/student/login", googleAuth, asyncHandler(async (req, res) => {
    const populatedUser = await req.user.populate({ path: "klasses", populate: { path: "students" } });
    res.render("quiz-app/login", { klasses: populatedUser.klasses, upgradeHostUrl: UPGRADE_HOST_URL, upgradeContext: UPGRADE_CONTEXT });
}));

// Intro Page
app.get("/quiz-app/session/:id/intro", googleAuth, asyncHandler(async (req, res) => {
    const foundSession = await Session.findById(req.params.id);
    if (!foundSession) {
        return res.redirect("/quiz-app/student/login");
    }
    const populatedSession = await foundSession.populate({ path: "student" });
    const message = introMessage(populatedSession.student.name);
    res.render("quiz-app/intro", { message, session: populatedSession, upgradeHostUrl: UPGRADE_HOST_URL });
}));

// Problem Page
app.get("/quiz-app/session/:id/problem", googleAuth, asyncHandler(async (req, res) => {
    const foundSession = await Session.findById(req.params.id);
    if (!foundSession) {
        return res.redirect("/quiz-app/student/login");
    }
    if (foundSession.numAnswered >= problems.length) {
        return res.redirect(`/quiz-app/session/${req.params.id}/outro`);
    }
    res.render("quiz-app/problem", { problem: problems[foundSession.numAnswered], session: foundSession, upgradeHostUrl: UPGRADE_HOST_URL, upgradeContext: UPGRADE_CONTEXT });
}));

// Outro Page
app.get("/quiz-app/session/:id/outro", googleAuth, asyncHandler(async (req, res) => {
    const foundSession = await Session.findById(req.params.id);
    if (!foundSession) {
        return res.redirect("/quiz-app/student/login");
    }
    const populatedSession = await foundSession.populate({ path: "student" });
    const message = outroMessage(populatedSession.student.name, foundSession.numCorrect);
    res.render("quiz-app/outro", { message, session: populatedSession, upgradeHostUrl: UPGRADE_HOST_URL, upgradeContext: UPGRADE_CONTEXT });
}));

/* ==================== Admin Tool ==================== */

// Summary Page
app.get("/admin-tool/summary", googleAuth, asyncHandler(async (req, res) => {
    const populatedUser = await req.user.populate({ path: "klasses", populate: { path: "students" } });
    res.render("admin-tool/summary", { klasses: populatedUser.klasses });
}));

/* ==================== Dev Console ==================== */

// Console Page
app.get("/dev-console/console", googleAuth, asyncHandler(async (req, res) => {
    res.render("dev-console/console");
}));

/* ==================== API ==================== */

// Login the user
app.post("/api/v1/login", asyncHandler(async (req, res) => {
    // Verify the token
    const { credential } = req.body;
    let payload = null;
    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });
        payload = ticket.getPayload();
    }
    catch (err) {
        throw { status: 401, message: "Failed to authorize the user, please log in" };
    }
    // Log in the user if the app is not being used by someone else
    const loginUser = () => {
        if (loggedInUser.exists && loggedInUser.email !== payload.email) {
            const currentDate = new Date();
            const loginDurationSeconds = Math.round((currentDate - loggedInUser.loggedInDate) / 1000);
            const inactiveDurationSeconds = Math.round((currentDate - loggedInUser.lastActiveDate) / 1000);
            if (loginDurationSeconds <= loggedInUser.maxLoginDurationSeconds &&
                inactiveDurationSeconds <= loggedInUser.maxInactiveDurationSeconds) {
                throw { status: 403, message: "Sorry, the app is currently being used by someone, please try again later." };
            }
        }
        loggedInUser.email = payload.email;
        loggedInUser.name = payload.name;
        loggedInUser.loggedInDate = new Date();
        loggedInUser.lastActiveDate = loggedInUser.loggedInDate;
        loggedInUser.exists = true;
    }
    // Check if the user has signed up
    const foundUser = await User.findOne({ email: payload.email });
    if (foundUser) {
        loginUser();
        return res.cookie("session-token", credential).json({
            message: "Successfully logged in the user"
        });
    }
    // If the user has not signed up, create a new user
    const newKlasses = [];
    const newKlassIds = [];
    for (const klass of klasses) {
        const newKlass = new Klass({ period: klass.period, students: [] });
        for (const studentName of klass.studentNames) {
            const newStudent = new Student({ name: studentName, parentKlass: newKlass._id });
            await newStudent.save();
            newKlass.students.push(newStudent._id);
        }
        newKlasses.push(newKlass);
        newKlassIds.push(newKlass._id);
    }
    const newUser = new User({ email: payload.email, name: payload.name, klasses: newKlassIds });
    await newUser.save();
    for (const newKlass of newKlasses) {
        newKlass.parentUser = newUser._id;
        await newKlass.save();
    }
    loginUser();
    res.cookie("session-token", credential).json({
        message: "Successfully signed up and logged in the user"
    });
}));

// Logout the user
app.get("/api/v1/logout", googleAuth, asyncHandler(async (req, res) => {
    if (loggedInUser.exists && loggedInUser.email === req.user.email) {
        loggedInUser.exists = false;
    }
    res.clearCookie("session-token");
    res.status(200).json({
        message: "Successfully logged out the user"
    });
}));

// Get students
app.get("/api/v1/students", googleAuth, asyncHandler(async (req, res) => {
    const populatedUser = await req.user.populate({ path: "klasses", populate: { path: "students" } });
    let students = [];
    for (const klass of populatedUser.klasses) {
        students.push.apply(students, klass.students);
    }
    res.status(200).json({
        message: "Successfully got students",
        students
    });
}));

// Get sessions
app.get("/api/v1/sessions", googleAuth, asyncHandler(async (req, res) => {
    const populatedSessions = await Session.find({ user: req.user._id }).populate({ path: "klass" }).populate({ path: "student" });
    res.status(200).json({
        message: "Successfully got sessions",
        sessions: populatedSessions
    });
}));

// Create a new session
app.post("/api/v1/session", googleAuth, asyncHandler(async (req, res) => {
    const { studentId, startDate } = req.body;
    const foundStudent = await Student.findById(studentId);
    const newSession = new Session({ user: req.user._id, klass: foundStudent.parentKlass, student: foundStudent._id, startDate, durationSeconds: 0, numAnswered: 0, numCorrect: 0 });
    await newSession.save();
    res.status(200).json({
        message: "Successfully created a new session",
        session: newSession
    });
}));

// Update a session by ID
app.put("/api/v1/session/:id", googleAuth, asyncHandler(async (req, res) => {
    const { currentDate, answer } = req.body;
    const foundSession = await Session.findById(req.params.id);
    if (!foundSession) {
        throw { status: 404, message: "Session not found" };
    }
    foundSession.durationSeconds = Math.round((new Date(currentDate) - new Date(foundSession.startDate)) / 1000);
    if (answer === problems[foundSession.numAnswered].correctAnswer) {
        foundSession.numCorrect++;
    }
    foundSession.numAnswered++;
    const updatedSession = await Session.findByIdAndUpdate(foundSession._id, foundSession);
    res.status(200).json({
        message: "Successfully updated the session",
        session: updatedSession
    });
}));

// Delete a session by ID
app.delete("/api/v1/session/:id", googleAuth, asyncHandler(async (req, res) => {
    const deletedSession = await Session.findByIdAndDelete(req.params.id);
    res.status(200).json({
        message: "Successfully deleted the session",
        session: deletedSession
    });
}));

// Clear sessions
app.delete("/api/v1/sessions", googleAuth, asyncHandler(async (req, res) => {
    const result = await Session.deleteMany({ user: req.user._id });
    res.status(200).json({
        message: "Successfully cleared sessions",
        result
    });
}));

// Delete sessions by class
app.delete("/api/v1/sessions/class/:id", googleAuth, asyncHandler(async (req, res) => {
    const foundKlass = await Klass.findById(req.params.id);
    const result = await Session.deleteMany({ klass: foundKlass._id });
    res.status(200).json({
        message: "Successfully deleted sessions",
        result
    });
}));

// Delete sessions by student
app.delete("/api/v1/sessions/student/:id", googleAuth, asyncHandler(async (req, res) => {
    const foundStudent = await Student.findById(req.params.id);
    const result = await Session.deleteMany({ student: foundStudent._id });
    res.status(200).json({
        message: "Successfully deleted sessions",
        result
    });
}));

// Get logs
app.get("/api/v1/logs", googleAuth, asyncHandler(async (req, res) => {
    const foundLogs = await Log.find({ user: req.user._id });
    res.status(200).json({
        message: "Successfully got logs",
        logs: foundLogs
    });
}));

// Create a new log
app.post("/api/v1/log", googleAuth, asyncHandler(async (req, res) => {
    const { level, date, message } = req.body;
    const newLog = new Log({ user: req.user._id, level, date, message });
    await newLog.save();
    res.status(200).json({
        message: "Successfully created a new log",
        log: newLog
    });
}));

// Clear logs
app.delete("/api/v1/logs", googleAuth, asyncHandler(async (req, res) => {
    const result = await Log.deleteMany({ user: req.user._id });
    res.status(200).json({
        message: "Successfully cleared logs",
        result
    });
}));

// Reset the database (only for development)
app.get("/api/v1/reset", googleAuth, asyncHandler(async (req, res, next) => {
    if (MODE !== "DEV") {
        return next();
    }
    console.log("Resetting the database...");
    await User.deleteMany({});
    await Klass.deleteMany({});
    await Student.deleteMany({});
    await Session.deleteMany({});
    await Log.deleteMany({});
    res.status(200).json({
        message: "Successfully reset the database"
    });
}));

// Get tours
app.get("/api/v1/tours", googleAuth, asyncHandler(async (req, res) => {
    res.status(200).json({
        message: "Successfully got tours",
        tours
    });
}));

/* ==================== UpGrade proxy endpoints ==================== */

// Get experiments
app.get("/api/v1/upgrade/experiments", googleAuth, upgradeAuth, asyncHandler(async (req, res) => {
    try {
        const response = await upgradeApiClient.get("/api/experiments", {
            headers: { "Authorization": `Bearer ${req.upgradeToken}` }
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        throw { status: error.response?.status || 500, message: error.message };
    }
}));

// Create a new experiment
app.post("/api/v1/upgrade/experiments", googleAuth, upgradeAuth, asyncHandler(async (req, res) => {
    try {
        const response = await upgradeApiClient.post("/api/experiments", req.body, {
            headers: {
                "Authorization": `Bearer ${req.upgradeToken}`,
                "Content-Type": "application/json"
            }
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        throw { status: error.response?.status || 500, message: error.message };
    }
}));

// Delete an experiment by ID
app.delete("/api/v1/upgrade/experiments/:experimentId", googleAuth, upgradeAuth, asyncHandler(async (req, res) => {
    try {
        const response = await upgradeApiClient.delete(`/api/experiments/${req.params.experimentId}`, {
            headers: { "Authorization": `Bearer ${req.upgradeToken}` }
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        throw { status: error.response?.status || 500, message: error.message };
    }
}));

// Save the metrics data
app.post("/api/v1/upgrade/metric/save", googleAuth, upgradeAuth, asyncHandler(async (req, res) => {
    try {
        const response = await upgradeApiClient.post("/api/metric/save", req.body, {
            headers: {
                "Authorization": `Bearer ${req.upgradeToken}`,
                "Content-Type": "application/json"
            }
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        throw { status: error.response?.status || 500, message: error.message };
    }
}));

// Clear the database
app.delete("/api/v1/upgrade/clearDB", googleAuth, upgradeAuth, asyncHandler(async (req, res) => {
    try {
        const response = await upgradeApiClient.delete("/api/v5/clearDB", {
            headers: { "Authorization": `Bearer ${req.upgradeToken}` }
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        throw { status: error.response?.status || 500, message: error.message };
    }
}));

/* ==================== AI Chat ==================== */

const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

// Returns true for transient Anthropic API errors that are safe to retry.
function isRetryableError(err) {
    const status = err.status;
    if (status === 429 || status === 529 || status === 503) return true;
    return (err.message || "").toLowerCase().includes("overloaded");
}

// Process a single stream event — writes SSE data to res and updates state.
function handleStreamEvent(event, state, res) {
    if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
        state.currentToolUse = {
            id: event.content_block.id,
            name: event.content_block.name,
            inputJSON: "",
        };
        // Notify client immediately so it can show a loading indicator
        // while tool input JSON is still being accumulated.
        res.write(`data: ${JSON.stringify({
            type: "tool_start",
            name: event.content_block.name,
        })}\n\n`);
        return;
    }

    if (event.type === "content_block_delta") {
        if (event.delta?.type === "text_delta") {
            res.write(`data: ${JSON.stringify({ type: "delta", text: event.delta.text })}\n\n`);
        } else if (event.delta?.type === "input_json_delta" && state.currentToolUse) {
            state.currentToolUse.inputJSON += event.delta.partial_json;
        }
        return;
    }

    if (event.type === "content_block_stop" && state.currentToolUse) {
        let input = {};
        try { input = JSON.parse(state.currentToolUse.inputJSON); } catch { input = {}; }
        res.write(`data: ${JSON.stringify({
            type: "tool_use",
            id: state.currentToolUse.id,
            name: state.currentToolUse.name,
            input,
        })}\n\n`);
        state.currentToolUse = null;
        return;
    }

    if (event.type === "message_delta" && event.delta?.stop_reason) {
        state.stopReason = event.delta.stop_reason;
    }
}

app.post("/api/v1/chat", express.json({ limit: "50mb" }), async (req, res) => {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "messages array is required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        // Track whether any content has been sent to the client so we don't
        // retry mid-stream (which would produce duplicate/corrupted output).
        let contentSent = false;
        const resTracker = {
            write(data) { contentSent = true; return res.write(data); },
        };

        try {
            const stream = anthropicClient.messages.stream({
                model: "claude-sonnet-4-6",
                max_tokens: 4096,
                system: SYSTEM_PROMPT,
                tools: TOOLS,
                messages,
            });

            const state = { currentToolUse: null, stopReason: "end_turn" };
            for await (const event of stream) {
                handleStreamEvent(event, state, resTracker);
            }

            res.write(`data: ${JSON.stringify({ type: "done", stop_reason: state.stopReason })}\n\n`);
            res.end();
            return;
        } catch (err) {
            const canRetry = !contentSent && isRetryableError(err) && attempt < MAX_RETRIES;

            if (canRetry) {
                const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
                console.warn(
                    `Retryable API error (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${err.message}. ` +
                    `Retrying in ${delay}ms...`,
                );
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            console.error("Claude API error:", err.message);
            res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
            res.end();
            return;
        }
    }
});

/* ==================== Errors ==================== */

// API not found
app.get("/api/v1/*", (req, res) => {
    throw { status: 404, message: "API not found" };
});

// Legacy API redirect (for backwards compatibility)
app.get("/api/v1/*", (req, res) => {
    throw { status: 404, message: "API not found" };
});

// Page not found
app.get("*", (req, res) => {
    throw { status: 404, message: "Page not found" };
});

// Handle errors
app.use((err, req, res, next) => {
    const error = {
        status: err.status || 500,
        message: err.message || "Internal Server Error",
        stack: err.stack
    };
    // Set status
    res.status(error.status);

    // Print the error to the console
    if (MODE === "DEV") {
        console.error(`Error: ${JSON.stringify(error, null, 2)}`);
    }
    // Respond with HTML page
    if (req.accepts("html")) {
        // Redirect to login if failed to authorize the user or the session has expired
        if (error.status === 401 || error.status === 403) {
            return res.redirect("/login");
        }
        return res.render("error", { error });
    }
    // Respond with JSON
    if (req.accepts("json")) {
        return res.json({ error });
    }
    // Default to plain text
    res.type("txt").send(JSON.stringify({ error }, null, 2));
});

/* ==================== Listen ==================== */

// Listening port
app.listen(PORT, () => {
    console.log(`Server is running localhost on port: ${PORT}`);
});