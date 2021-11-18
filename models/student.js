const mongoose = require("mongoose");

const studentSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    parentKlass: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Klass"
    }
});

module.exports = mongoose.model("Student", studentSchema);