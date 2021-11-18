const mongoose = require("mongoose");

const sessionSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    klass: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Klass",
        required: true
    },    
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },
    startDate: {
        type: String,
        default: "",
    },
    durationSeconds: {
        type: Number,
        default: 0
    },
    numAnswered: {
        type: Number,
        default: 0
    },
    numCorrect: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model("Session", sessionSchema);