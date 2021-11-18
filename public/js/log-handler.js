class LogHandler {
    async post(level, message) {
        console.log(message);
        const date = new Date().toISOString();
        const data = await FetchWrapper.post("/api/log", { level, date, message });
        if (data.error) {
            alert(`Error: ${data.error.message}`);
            console.error(data.error);
        }
        return data;
    }
    static async fatal(message) {
        alert(`Fatal: ${message}`);
        return await this.prototype.post("fatal", message);
    }
    static async error(message) {
        alert(`Error: ${message}`);
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