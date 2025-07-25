class FetchWrapper {
    async getData(response) {
        const data = await response.json();
        if (data.error) {
            throw data.error;
        }
        return data;
    }
    async fetchGetDelete(url, method) {
        const response = await fetch(`/upgrade-demo${url}`, {
            method,
            headers: { "Accept": "application/json", "Content-Type": "application/json" }
        });
        return await this.getData(response);
    }
    async fetchPostPut(url, method, data = {}) {
        const response = await fetch(`/upgrade-demo${url}`, {
            method,
            headers: { "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        return await this.getData(response);
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