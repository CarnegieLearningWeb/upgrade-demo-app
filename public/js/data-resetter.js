class DataResetter {
    constructor(context) {
        this.context = context;
    }
    async clearUpgradeData() {
        await FetchWrapper.delete("/api/v1/upgrade/clearDB");
    }
    async clearDemoAppData() {
        await FetchWrapper.delete("/api/v1/logs");
        await FetchWrapper.delete("/api/v1/sessions");
    }
    async saveMetrics() {
        await FetchWrapper.post("/api/v1/upgrade/metric/save", {
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
        await FetchWrapper.delete(`/api/v1/upgrade/experiments/${experimentId}`);
    }
    async deleteAllExperiments() {
        const experiments = await FetchWrapper.get("/api/v1/upgrade/experiments");
        for (const experiment of experiments) {
            await this.deleteExperiment(experiment.id);
        }
    }
    async createExperiment(experimentFilePath) {
        const response = await fetch(experimentFilePath);
        const json = await response.json();
        await FetchWrapper.post("/api/v1/upgrade/experiments", json);
    }
}