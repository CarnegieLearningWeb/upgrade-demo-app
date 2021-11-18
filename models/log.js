const mongoose = require("mongoose");

const logSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    level: {
        type: String,
        default: "info",
        enum: ["fatal", "error", "warn", "info", "debug", "trace"]
    },
    date: {
        type: String,
        default: "",
    },
    message: {
        type: String,
        default: "",
    }
});

module.exports = mongoose.model("Log", logSchema);