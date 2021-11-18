const mongoose = require("mongoose");

const klassSchema = mongoose.Schema({
    period: {
        type: String,
        required: true
    },
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        default: []
    }],
    parentUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
});

module.exports = mongoose.model("Klass", klassSchema);