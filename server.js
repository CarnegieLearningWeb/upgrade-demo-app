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
app.get("/upgrade-demo/health", (req, res) => {
    res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "upgrade-demo-app"
    });
});

/* ==================== Login/Home ==================== */

// Root Page
app.get("/upgrade-demo/", asyncHandler(async (req, res) => {
    res.redirect("/upgrade-demo/home");
}));

// Root redirect (for backwards compatibility)
app.get("/", asyncHandler(async (req, res) => {
    res.redirect("/upgrade-demo/home");
}));

// Login Page
app.get("/upgrade-demo/login", asyncHandler(async (req, res) => {
    res.render("login", { googleClientId: GOOGLE_CLIENT_ID, upgradeContext: UPGRADE_CONTEXT });
}));

// Home Page
app.get("/upgrade-demo/home", googleAuth, asyncHandler(async (req, res) => {
    res.render("home", { upgradeHostUrl: UPGRADE_HOST_URL, upgradeBaseUrl: UPGRADE_BASE_URL, upgradeContext: UPGRADE_CONTEXT, tours });
}));

// Download experiment file
app.get("/upgrade-demo/file/experiment/:filename", googleAuth, asyncHandler(async (req, res) => {
    res.download(path.join(__dirname, `public/asset/experiment/${req.params.filename}`));
}));

/* ==================== QuizApp ==================== */

// Login Page
app.get("/upgrade-demo/quiz-app/student/login", googleAuth, asyncHandler(async (req, res) => {
    const populatedUser = await req.user.populate({ path: "klasses", populate: { path: "students" } });
    res.render("quiz-app/login", { klasses: populatedUser.klasses, upgradeHostUrl: UPGRADE_HOST_URL, upgradeContext: UPGRADE_CONTEXT });
}));

// Intro Page
app.get("/upgrade-demo/quiz-app/session/:id/intro", googleAuth, asyncHandler(async (req, res) => {
    const foundSession = await Session.findById(req.params.id);
    if (!foundSession) {
        return res.redirect("/upgrade-demo/quiz-app/student/login");
    }
    const populatedSession = await foundSession.populate({ path: "student" });
    const message = introMessage(populatedSession.student.name);
    res.render("quiz-app/intro", { message, session: populatedSession, upgradeHostUrl: UPGRADE_HOST_URL });
}));

// Problem Page
app.get("/upgrade-demo/quiz-app/session/:id/problem", googleAuth, asyncHandler(async (req, res) => {
    const foundSession = await Session.findById(req.params.id);
    if (!foundSession) {
        return res.redirect("/upgrade-demo/quiz-app/student/login");
    }
    if (foundSession.numAnswered >= problems.length) {
        return res.redirect(`/upgrade-demo/quiz-app/session/${req.params.id}/outro`);
    }
    res.render("quiz-app/problem", { problem: problems[foundSession.numAnswered], session: foundSession, upgradeHostUrl: UPGRADE_HOST_URL, upgradeContext: UPGRADE_CONTEXT });
}));

// Outro Page
app.get("/upgrade-demo/quiz-app/session/:id/outro", googleAuth, asyncHandler(async (req, res) => {
    const foundSession = await Session.findById(req.params.id);
    if (!foundSession) {
        return res.redirect("/upgrade-demo/quiz-app/student/login");
    }
    const populatedSession = await foundSession.populate({ path: "student" });
    const message = outroMessage(populatedSession.student.name, foundSession.numCorrect);
    res.render("quiz-app/outro", { message, session: populatedSession, upgradeHostUrl: UPGRADE_HOST_URL, upgradeContext: UPGRADE_CONTEXT });
}));

/* ==================== Admin Tool ==================== */

// Summary Page
app.get("/upgrade-demo/admin-tool/summary", googleAuth, asyncHandler(async (req, res) => {
    const populatedUser = await req.user.populate({ path: "klasses", populate: { path: "students" } });
    res.render("admin-tool/summary", { klasses: populatedUser.klasses });
}));

/* ==================== Dev Console ==================== */

// Console Page
app.get("/upgrade-demo/dev-console/console", googleAuth, asyncHandler(async (req, res) => {
    res.render("dev-console/console");
}));

/* ==================== API ==================== */

// Login the user
app.post("/upgrade-demo/api/v1/login", asyncHandler(async (req, res) => {
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
app.get("/upgrade-demo/api/v1/logout", googleAuth, asyncHandler(async (req, res) => {
    if (loggedInUser.exists && loggedInUser.email === req.user.email) {
        loggedInUser.exists = false;
    }
    res.clearCookie("session-token");
    res.status(200).json({
        message: "Successfully logged out the user"
    });
}));

// Get students
app.get("/upgrade-demo/api/v1/students", googleAuth, asyncHandler(async (req, res) => {
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
app.get("/upgrade-demo/api/v1/sessions", googleAuth, asyncHandler(async (req, res) => {
    const populatedSessions = await Session.find({ user: req.user._id }).populate({ path: "klass" }).populate({ path: "student" });
    res.status(200).json({
        message: "Successfully got sessions",
        sessions: populatedSessions
    });
}));

// Create a new session
app.post("/upgrade-demo/api/v1/session", googleAuth, asyncHandler(async (req, res) => {
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
app.put("/upgrade-demo/api/v1/session/:id", googleAuth, asyncHandler(async (req, res) => {
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
app.delete("/upgrade-demo/api/v1/session/:id", googleAuth, asyncHandler(async (req, res) => {
    const deletedSession = await Session.findByIdAndDelete(req.params.id);
    res.status(200).json({
        message: "Successfully deleted the session",
        session: deletedSession
    });
}));

// Clear sessions
app.delete("/upgrade-demo/api/v1/sessions", googleAuth, asyncHandler(async (req, res) => {
    const result = await Session.deleteMany({ user: req.user._id });
    res.status(200).json({
        message: "Successfully cleared sessions",
        result
    });
}));

// Delete sessions by class
app.delete("/upgrade-demo/api/v1/sessions/class/:id", googleAuth, asyncHandler(async (req, res) => {
    const foundKlass = await Klass.findById(req.params.id);
    const result = await Session.deleteMany({ klass: foundKlass._id });
    res.status(200).json({
        message: "Successfully deleted sessions",
        result
    });
}));

// Delete sessions by student
app.delete("/upgrade-demo/api/v1/sessions/student/:id", googleAuth, asyncHandler(async (req, res) => {
    const foundStudent = await Student.findById(req.params.id);
    const result = await Session.deleteMany({ student: foundStudent._id });
    res.status(200).json({
        message: "Successfully deleted sessions",
        result
    });
}));

// Get logs
app.get("/upgrade-demo/api/v1/logs", googleAuth, asyncHandler(async (req, res) => {
    const foundLogs = await Log.find({ user: req.user._id });
    res.status(200).json({
        message: "Successfully got logs",
        logs: foundLogs
    });
}));

// Create a new log
app.post("/upgrade-demo/api/v1/log", googleAuth, asyncHandler(async (req, res) => {
    const { level, date, message } = req.body;
    const newLog = new Log({ user: req.user._id, level, date, message });
    await newLog.save();
    res.status(200).json({
        message: "Successfully created a new log",
        log: newLog
    });
}));

// Clear logs
app.delete("/upgrade-demo/api/v1/logs", googleAuth, asyncHandler(async (req, res) => {
    const result = await Log.deleteMany({ user: req.user._id });
    res.status(200).json({
        message: "Successfully cleared logs",
        result
    });
}));

// Reset the database (only for development)
app.get("/upgrade-demo/api/v1/reset", googleAuth, asyncHandler(async (req, res, next) => {
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
app.get("/upgrade-demo/api/v1/tours", googleAuth, asyncHandler(async (req, res) => {
    res.status(200).json({
        message: "Successfully got tours",
        tours
    });
}));

/* ==================== UpGrade proxy endpoints ==================== */

// Get experiments
app.get("/upgrade-demo/api/v1/upgrade/experiments", googleAuth, upgradeAuth, asyncHandler(async (req, res) => {
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
app.post("/upgrade-demo/api/v1/upgrade/experiments", googleAuth, upgradeAuth, asyncHandler(async (req, res) => {
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
app.delete("/upgrade-demo/api/v1/upgrade/experiments/:experimentId", googleAuth, upgradeAuth, asyncHandler(async (req, res) => {
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
app.post("/upgrade-demo/api/v1/upgrade/metric/save", googleAuth, upgradeAuth, asyncHandler(async (req, res) => {
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
app.delete("/upgrade-demo/api/v1/upgrade/clearDB", googleAuth, upgradeAuth, asyncHandler(async (req, res) => {
    try {
        const response = await upgradeApiClient.delete("/api/v5/clearDB", {
            headers: { "Authorization": `Bearer ${req.upgradeToken}` }
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        throw { status: error.response?.status || 500, message: error.message };
    }
}));

/* ==================== Errors ==================== */

// API not found
app.get("/upgrade-demo/api/v1/*", (req, res) => {
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
            return res.redirect("/upgrade-demo/login");
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