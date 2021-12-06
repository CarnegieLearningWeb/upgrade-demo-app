class LogHandler {
    async post(level, message) {
        const date = new Date().toISOString();
        return await FetchWrapper.post("/api/v1/log", { level, date, message });
    }
    static async fatal(message) {
        return await this.prototype.post("fatal", message);
    }
    static async error(message) {
        return await this.prototype.post("error", message);
    }
    static async warn(message) {
        return await this.prototype.post("warn", message);
    }
    static async info(message) {
        return await this.prototype.post("info", message);
    }
    static async debug(message) {
        return await this.prototype.post("debug", message);
    }
    static async trace(message) {
        return await this.prototype.post("trace", message);
    }
}