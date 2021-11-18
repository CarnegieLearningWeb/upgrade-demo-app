class FetchWrapper {
    async fetchGetDelete(url, method) {
        const response = await fetch(url, {
            method
        });
        return await response.json();
    }
    async fetchPostPut(url, method, data = {}) {
        const response = await fetch(url, {
            method,
            headers: { "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        return await response.json();
    }
    static async get(url) {
        return await this.prototype.fetchGetDelete(url, "GET");
    }
    static async post(url, data) {
        return await this.prototype.fetchPostPut(url, "POST", data);
    }
    static async put(url, data) {
        return await this.prototype.fetchPostPut(url, "PUT", data);
    }
    static async delete(url) {
        return await this.prototype.fetchGetDelete(url, "DELETE");
    }
}