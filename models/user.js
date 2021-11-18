const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    klasses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Klass",
        default: []
    }]
});

module.exports = mongoose.model("User", userSchema);