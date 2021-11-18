module.exports = (studentName) => {
    const message = {};
    message.greetings = `Hey ${studentName.split(" ")[0]}, how are you?`;
    message.goal = "Today, we are going to solve three area problems.";
    return message;
}