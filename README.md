# UpGrade Demo App

## Description
An app to demonstrate UpGrade, an open-source platform to support large-scale A/B testing in educational applications. Learn more at www.upgradeplatform.org

## Setup
1. Installation of node.js is required.
2. Setup [UpGrade](https://github.com/CarnegieLearningWeb/UpGrade) following this [guide](https://upgrade-platform.gitbook.io/upgrade-documentation/hosting) and run the backend and frontend applications. 
3. Run the following commands in the Terminal:
```
git clone https://github.com/CarnegieLearningWeb/upgrade-demo-app.git
cd upgrade-demo-app
touch .env
```
4. Open the `.env` file with an editor and add the following variables:
```
PORT=8080
MONGODB_URI={MongoDB Connection String starting with mongodb+srv://}
GOOGLE_CLIENT_ID={Google OAuth 2.0 Client ID}
UPGRADE_HOST_URL={UpGrade Backend Host URL (e.g. http://localhost:3030)}
UPGRADE_BASE_URL={UpGrade Frontend Base URL (e.g. http://localhost:4200)}
UPGRADE_CONTEXT={Name of the UpGrade Experiment Context (e.g. app)}
IS_PRODUCTION={Whether the app is in production mode or not (YES or NO)}
```
5. Run the following commands in the Terminal:
```
npm install dependencies
npm start
```
6. Open your web browser and navigate to http://localhost:8080
