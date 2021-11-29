module.exports = [
    {
        name: "Welcome Tour",
        steps: [
            {
                context: "quiz-app",
                title: "Use without UpGrade",
                substeps: [
                    {
                        content: `QuizApp is a simple educational app that illustrates how such apps work with UpGrade.<br><br>Login to QuizApp by clicking "Login".<br><br>You will be using QuizApp as a student named {studentName}.`,
                        initCall: {
                            context: "quiz-app",
                            type: "function",
                            id: "select-nth-student",
                            args: [1, "{studentName}"]
                        },
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "login-button"
                        }
                    },
                    {
                        content: `Click on the "Start" button to start using QuizApp.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "start-button"
                        }
                    },
                    {
                        content: `Type in your answer and click on the "Submit" button.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "submit-button"
                        }
                    },
                    {
                        content: `Type in your answer and click on the "Submit" button.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "submit-button"
                        }
                    },
                    {
                        content: `Type in your answer and click on the "Submit" button.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "submit-button"
                        }
                    },
                    {
                        content: `We are done with QuizApp for now. Click on the "Log out" button.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "logout-button"
                        }
                    },
                    {
                        content: `Now that you understand how QuizApp works, let's set up an experiment in UpGrade. Click the "UpGrade" tab.`,
                        nextCallback: {
                            context: "home",
                            type: "click",
                            id: "upgrade-tab"
                        }
                    }
                ]
            },
            {
                context: "upgrade",
                title: "Set up an experiment",
                substeps: [
                    {
                        content: `UpGrade allows you to run an experiment within QuizApp.<br><br>Login to UpGrade by clicking the "Login with Google" button.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "login-with-google-button"
                        }
                    },
                    {
                        content: `Using UpGrade, you can randomly assign different students to experience different features within QuizApp.<br><br>To illustrate this, <a id="experiment-file-download-link" href="/file/experiment/area-concrete-or-abstract.json">download the experiment file</a>`,
                        nextCallback: {
                            context: "home",
                            type: "click",
                            id: "experiment-file-download-link"
                        }
                    },
                    {
                        content: `Click the "IMPORT EXPERIMENT" button and select the experiment file you just downloaded, then click "IMPORT".`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "import-experiment-button"
                        }
                    },
                    {
                        content: `Click the "IMPORT EXPERIMENT" button and select the experiment file you just downloaded, then click "IMPORT".`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "import-experiment-choose-file-button"
                        }
                    },
                    {
                        content: `Click the "IMPORT EXPERIMENT" button and select the experiment file you just downloaded, then click "IMPORT".`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "import-experiment-import-button"
                        }
                    },
                    {
                        content: `Click on the imported experiment "Area - Concrete or Abstract".`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-name-area-concrete-or-abstract"
                        }
                    },
                    {
                        content: `Click on the "Inactive" under "STATUS".`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-detail-status"
                        }
                    },
                    {
                        content: `Set the New Status to "Enrolling", then click "SAVE".`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-detail-status-new-status-select"
                        }
                    },
                    {
                        content: `Set the New Status to "Enrolling", then click "SAVE".`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-detail-status-new-status-select-enrolling"
                        }
                    },
                    {
                        content: `Set the New Status to "Enrolling", then click "SAVE".`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-detail-status-save-button"
                        }
                    },
                    {
                        content: `Now we have set up an experiment in UpGrade.<br><br>In order to illustrate how UpGrade randomly changes QuizApp for different students, you're going to log in three times as three different students.<br><br>Click the "QuizApp" tab.`,
                        nextCallback: {
                            context: "home",
                            type: "click",
                            id: "quiz-app-tab"
                        }
                    }
                ]
            },
            {
                context: "quiz-app",
                title: "Use 3 times with UpGrade",
                substeps: [
                    {
                        content: `Click "Login" to log in as {studentName}.`,
                        initCall: {
                            context: "quiz-app",
                            type: "function",
                            id: "select-nth-student",
                            args: [2, "{studentName}"]
                        },
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "login-button"
                        }
                    },
                    {
                        content: `Click on the "Start" button to start solving the problems. Feel free to submit wrong answers.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "start-button"
                        }
                    },
                    {
                        content: `Type in your answer and click on the "Submit" button.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "submit-button"
                        }
                    },
                    {
                        content: `Type in your answer and click on the "Submit" button.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "submit-button"
                        }
                    },
                    {
                        content: `Type in your answer and click on the "Submit" button.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "submit-button"
                        }
                    },
                    {
                        content: `Click on the "Log out" button.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "logout-button"
                        }
                    },
                    {
                        content: `Now log in as a second student. Click "Login" to log in as {studentName}.`,
                        initCall: {
                            context: "quiz-app",
                            type: "function",
                            id: "select-nth-student",
                            args: [3, "{studentName}"]
                        },
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "login-button"
                        }
                    },
                    {
                        content: `Click on the "Start" button to start solving the problems. Feel free to submit wrong answers.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "start-button"
                        }
                    },
                    {
                        content: `Type in your answer and click on the "Submit" button.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "submit-button"
                        }
                    },
                    {
                        content: `Type in your answer and click on the "Submit" button.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "submit-button"
                        }
                    },
                    {
                        content: `Type in your answer and click on the "Submit" button.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "submit-button"
                        }
                    },
                    {
                        content: `Click on the "Log out" button.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "logout-button"
                        }
                    },
                    {
                        content: `Now log in as a third student. Click "Login" to log in as {studentName}.`,
                        initCall: {
                            context: "quiz-app",
                            type: "function",
                            id: "select-nth-student",
                            args: [4, "{studentName}"]
                        },
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "login-button"
                        }
                    },
                    {
                        content: `Click on the "Start" button to start solving the problems. Feel free to submit wrong answers.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "start-button"
                        }
                    },
                    {
                        content: `Type in your answer and click on the "Submit" button.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "submit-button"
                        }
                    },
                    {
                        content: `Type in your answer and click on the "Submit" button.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "submit-button"
                        }
                    },
                    {
                        content: `Type in your answer and click on the "Submit" button.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "submit-button"
                        }
                    },
                    {
                        content: `Click on the "Log out" button.`,
                        nextCallback: {
                            context: "quiz-app",
                            type: "click",
                            id: "logout-button"
                        }
                    },
                    {
                        content: `Now let's go back to UpGrade and look at the data. Click the "UpGrade" tab.`,
                        nextCallback: {
                            context: "home",
                            type: "click",
                            id: "upgrade-tab"
                        }
                    }
                ]
            },
            {
                context: "upgrade",
                title: "View the data",
                substeps: [
                    {
                        content: `Click on the experiment "Area - Concrete or Abstract".`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-name-area-concrete-or-abstract"
                        }
                    },
                    {
                        content: `This experiment looks at percent correct and duration to see if they differ when students get Concrete vs. Abstract problems. Scroll down to see the results.<br><br>If you like, explore other UpGrade features or try another tour.`,
                        buttonTexts: ["Finish Welcome Tour"]
                    }
                ]
            }
        ]
    }
];