module.exports = [
    {
        name: "Welcome Tour",
        steps: [
            {
                context: "quiz-app",
                title: "Student Experience before UpGrade",
                substeps: [
                    {
                        content: `Let's start by illustrating the student's experience with QuizApp, an educational app that allows us to illustrate how UpGrade works. This is before an UpGrade experiment is put in place and you'll notice that all students have the same set of problems in their learning experience.<br><br>You'll log into QuizApp as a student named {studentName}. Simply click the "Login” button to get started.`,
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
                        content: `To set up an experiment with UpGrade, click the "UpGrade” tab at the top of the page.`,
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
                title: "Create UpGrade Experiment",
                substeps: [
                    {
                        content: `Upgrade allows you to run an experiment within QuizApp.<br><br>Log into UpGrade using a Google account by clicking the "Login with Google” button.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "login-with-google-button"
                        }
                    },
                    {
                        content: `In this experiment we randomly assign users of QuizApp two different experiences. Users in the Concrete condition will see real-world, concrete items mapped onto the shapes in their QuizApp problems. Users in the Abstract condition will see only the abstract shapes in their QuizApp problems (Abstract problems are the same as those you saw when using QuizApp without UpGrade).<br><br>To illustrate this, <a id="experiment-file-download-link" href="/file/experiment/area-concrete-or-abstract.json">download this experiment file</a> to your computer for import into UpGrade.`,
                        nextCallback: {
                            context: "home",
                            type: "click",
                            id: "experiment-file-download-link"
                        }
                    },
                    {
                        content: `Click the "IMPORT EXPERIMENT” button and select the experiment file you just downloaded called "area-concrete-or-abstract.json.”<br><br>Once the JSON file is selected, click "IMPORT.”`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "import-experiment-button"
                        }
                    },
                    {
                        content: `Click the "IMPORT EXPERIMENT” button and select the experiment file you just downloaded called "area-concrete-or-abstract.json.”<br><br>Once the JSON file is selected, click "IMPORT.”`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "import-experiment-choose-file-button"
                        }
                    },
                    {
                        content: `Click the "IMPORT EXPERIMENT” button and select the experiment file you just downloaded called "area-concrete-or-abstract.json.”<br><br>Once the JSON file is selected, click "IMPORT.”`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "import-experiment-import-button"
                        }
                    },
                    {
                        content: `You have now defined an experiment in UpGrade.<br><br>Click on the imported experiment "Area - Concrete or Abstract" to view it.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-name-area-concrete-or-abstract"
                        }
                    },
                    {
                        content: `The experiment is defined but it is not running.<br><br>To activate it, click on the word "Inactive" under "STATUS".`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-detail-status"
                        }
                    },
                    {
                        content: `To start running the experiment, set the New Status "Enrolling” and then click "SAVE.”`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-detail-status-new-status-select"
                        }
                    },
                    {
                        content: `To start running the experiment, set the New Status "Enrolling” and then click "SAVE.”`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-detail-status-new-status-select-enrolling"
                        }
                    },
                    {
                        content: `To start running the experiment, set the New Status "Enrolling” and then click "SAVE.”`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-detail-status-save-button"
                        }
                    },
                    {
                        content: `Now we have set up and started an experiment in UpGrade.<br><br>In order to illustrate how UpGrade randomly changes QuizApp for different students, you're going to log in three times as three different students.<br><br>Click the "QuizApp" tab at the top of the page.`,
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
                title: "Student Experience with UpGrade",
                substeps: [
                    {
                        content: `Now let's show you what 3 different students see with the UpGrade experiment in place. Some students will be randomly assigned the Concrete condition, and others will be assigned the Abstract condition.<br><br>Let's start by clicking the "Login" button to log in as {studentName}, our first student.`,
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
                        content: `Now click the "Login” button to log in as {studentName}, our second student.`,
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
                        content: `Now click the "Login” button to log in as {studentName}, our third student.`,
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
                        content: `Now let's go back to UpGrade and look at the data.<br><br>Click the "UpGrade" tab at the top of the page.`,
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
                        content: `Now let's show you the results of the UpGrade experiment.<br><br>Click on the experiment "Area - Concrete or Abstract".`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-name-area-concrete-or-abstract"
                        }
                    },
                    {
                        content: `This experiment measures percent correct and duration to see if they differ when students get Concrete vs. Abstract problems. Scroll down to see the enrollments by condition.<br><br>Click on "Percent Correct" and "Duration in Seconds" to see the result on these metrics at the bottom of the page.`,
                        buttonTexts: ["Finish Welcome Tour"]
                    }
                ]
            }
        ]
    }
];