class DataResetter {
    constructor(hostUrl, context) {
        this.hostUrl = hostUrl;
        this.context = context;
    }
    async clearUpgradeData() {
        await FetchWrapper.delete(`${this.hostUrl}/api/clearDB`);
    }
    async clearDemoAppData() {
        await FetchWrapper.delete("/api/v1/logs");
        await FetchWrapper.delete("/api/v1/sessions");
    }
    async saveMetrics() {
        await FetchWrapper.post(`${this.hostUrl}/api/metric/save`, {
            metricUnit: [{
                metric: "durationSeconds",
                datatype: "continuous"
            },
            {
                metric: "percentCorrect",
                datatype: "continuous"
            }
            ],
            context: [this.context]
        });
    }
    async deleteExperiment(experimentId) {
        await FetchWrapper.delete(`${this.hostUrl}/api/experiments/${experimentId}`);
    }
    async deleteAllExperiments() {
        const experiments = await FetchWrapper.get(`${this.hostUrl}/api/experiments`);
        for (const experiment of experiments) {
            await this.deleteExperiment(experiment.id);
        }
    }
}