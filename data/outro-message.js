module.exports = (studentName, numCorrect) => {
    const message = {};
    switch (numCorrect) {
        case 0:
            message.feedback = "You need improvement";
            message.result = "no answer";
            break;
        case 1:
            message.feedback = "You can do better";
            message.result = "only one answer";
            break;
        case 2:
            message.feedback = "Great job";
            message.result = "two answers";
            break;
        default:
            message.feedback = "Excellent job";
            message.result = "all three answers";
    }
    message.feedback += ` ${studentName.split(" ")[0]}!`;
    message.result = "You got " + message.result + " correct.";
    return message;
}