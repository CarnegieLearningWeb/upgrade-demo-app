module.exports = [
    {
        name: "Welcome Tour",
        steps: [
            {
                context: "quiz-app",
                title: "Student Experience before UpGrade",
                substeps: [
                    {
                        content: `Let's start by illustrating the student's experience with QuizApp, an educational app that allows us to illustrate how UpGrade works. This is before an UpGrade experiment is put in place and you'll notice that all students have the same set of problems in their learning experience.<br><br>You'll log into QuizApp as a student named {studentName}. Simply click the "Login" button to get started.`,
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
                        content: `To set up an experiment with UpGrade, click the "UpGrade" tab at the top of the page.`,
                        initCall: {
                            context: "upgrade",
                            type: "function",
                            id: "logout"
                        },
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
                title: "Set up an Experiment in UpGrade",
                substeps: [
                    {
                        content: `Upgrade allows you to run an experiment within QuizApp.<br><br>Log into UpGrade using a Google account by clicking the "Sign in with Google" button.`,
                        initCall: {
                            context: "home",
                            type: "function",
                            id: "create-experiment-area-question-type"
                        },
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["upgrade-logo-link", "innerText", "UpGrade"]
                        }
                    },
                    {
                        content: `In this experiment we randomly assign users of QuizApp two different experiences. Users in the Concrete condition will see real-world, concrete items mapped onto the shapes in their QuizApp problems. Users in the Abstract condition will see only the abstract shapes in their QuizApp problems (Abstract problems are the same as those you saw when using QuizApp without UpGrade).<br><br>To illustrate this, click on the defined experiment "Area - Question Type."`,
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-experiment-click",
                            args: ["Area - Question Type"]
                        }
                    },
                    {
                        content: `The experiment is defined but it is not running.<br><br>To activate it, click on the word "Inactive" under "STATUS."`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-details-overview-status"
                        }
                    },
                    {
                        content: `To start running the experiment, set the New Status "Enrolling" and then click "SAVE."`,
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["change-experiment-status-modal-new-status", "innerText", "Enrolling"]
                        }
                    },
                    {
                        content: `To start running the experiment, set the New Status "Enrolling" and then click "SAVE."`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "change-experiment-status-modal-save-button"
                        }
                    },
                    {
                        content: `Now we have set up and started an experiment in UpGrade.<br><br>In order to illustrate how UpGrade randomly changes QuizApp for different students, you're going to log in three times as three different students.<br><br>Click the "QuizApp" tab at the top of the page.`,
                        initCall: {
                            context: "home",
                            type: "function",
                            id: "set-third-student"
                        },
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
                        content: `Now click the "Login" button to log in as {studentName}, our second student.`,
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
                        content: `Now click the "Login" button to log in as {studentName}, our third student.`,
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
                        content: `Now let's show you the results of the UpGrade experiment.<br><br>Click on the experiment "Area - Question Type."`,
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-experiment-click",
                            args: ["Area - Question Type"]
                        }
                    },
                    {
                        content: `Click on the "Data" tab to see the results.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-details-data-tab"
                        }
                    },
                    {
                        content: `This experiment measures percent correct and duration to see if they differ when students get Concrete vs. Abstract problems. Scroll down to see the enrollments by condition.<br><br>Click on "Percent Correct (Mean)" and "Duration in Seconds (Mean)" to see the result on these metrics at the bottom of the page.`,
                        buttonTexts: ["Finish Welcome Tour"]
                    }
                ]
            }
        ]
    },
    {
        name: "Experiment UI Tour",
        steps: [
            {
                context: "upgrade",
                title: "Open the Experiment Stepper",
                substeps: [
                    {
                        content: `We're going to walk through the steps of how to create an experiment in UpGrade.<br><br>Log into UpGrade using a Google account by clicking the "Sign in with Google" button.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["upgrade-logo-link", "innerText", "UpGrade"]
                        }
                    },
                    {
                        content: `Click the "ADD EXPERIMENT" button to start the experiment creation process.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "add-experiment-button"
                        }
                    }
                ]
            },
            {
                context: "upgrade",
                title: "Complete the Overview Step",
                substeps: [
                    {
                        content: `In our example experiment, we're going to compare two different approaches to displaying geometric area problems. The experiment can be named anything, but for this tour, I name it "Area - Question Type."<br><br>Type this into the "Name" field or or press the copy button to copy and paste the text.`,
                        initCall: {
                            context: "home",
                            type: "function",
                            id: "insert-copy-to-clipboard-buttons",
                            args: ["Area - Question Type"]
                        },
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-overview-name", "value", "Area - Question Type"]
                        }
                    },
                    {
                        content: `In the "Description" field, we can optionally add more details about the experiment.<br><br>Let's type "This experiment randomly assigns individual users to get either concrete or abstract area problems." here.`,
                        initCall: {
                            context: "home",
                            type: "function",
                            id: "insert-copy-to-clipboard-buttons",
                            args: ["This experiment randomly assigns individual users to get either concrete or abstract area problems."]
                        },
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-overview-description", "value", "This experiment randomly assigns individual users to get either concrete or abstract area problems."]
                        }
                    },
                    {
                        content: `Next we'll indicate where the experiment will run, known to UpGrade as the App Context.<br><br>Click on the "App Context" drop-down and select "add."`,
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-overview-app-context", "innerText", "add"]
                        }
                    },
                    {
                        content: `Now we will set whether the condition will be assigned individually or by group (e.g. school, class, teacher).<br><br>Click on the "Unit of Assignment" drop-down and select "Individual."`,
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-overview-unit-of-assignment", "innerText", "Individual"]
                        }
                    },
                    {
                        content: `To manage consistency of learner experiences, click on the "Consistency Rule" drop-down and select "Individual."<br><br>To learn more about the Consistency Rule, see the <a href="https://upgrade-platform.gitbook.io/upgrade-documentation/glossary" target="_blank" rel="noopener noreferrer">UpGrade glossary</a> in the documentation.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-overview-consistency-rule", "innerText", "Individual"]
                        }
                    },
                    {
                        content: `Click the "Next" button at the bottom to move to the next step.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-stepper-overview-next-button"
                        }
                    }
                ]
            },
            {
                context: "upgrade",
                title: "Complete the Design Step",
                substeps: [
                    {
                        content: `Now we'll define a decision point for this experiment. A decision point is a place in the client application where the condition will be assigned.<br><br>Click "Add Decision Point" to add a decision point.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-stepper-design-add-decision-point-button"
                        }
                    },
                    {
                        content: `A decision point consists of Site and Target.<br><br>Type "area" into the "Site" field, and type "question_type" into the "Target" field.`,
                        initCall: {
                            context: "home",
                            type: "function",
                            id: "insert-copy-to-clipboard-buttons",
                            args: ["area", "question_type"]
                        },
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-design-decision-points-row1-site", "value", "area"]
                        }
                    },
                    {
                        content: `A decision point consists of Site and Target.<br><br>Type "area" into the "Site" field, and type "question_type" into the "Target" field.`,
                        initCall: {
                            context: "home",
                            type: "function",
                            id: "insert-copy-to-clipboard-buttons",
                            args: ["area", "question_type"]
                        },
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-design-decision-points-row1-target", "value", "question_type"]
                        }
                    },
                    {
                        content: `Click on the "Exclude If Reached" checkbox to enable it. This will exclude participants who have previously reached the decision point.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-design-decision-points-row1-exclude-if-reached", "checked", true]
                        }
                    },
                    {
                        content: `Click the checkmark icon to confirm and create a row.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-stepper-design-decision-points-row1-confirm-button"
                        }
                    },
                    {
                        content: `Now let's define the conditions for this experiment.<br><br>Click "Add Condition" to add a condition.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-stepper-design-add-condition-button"
                        }
                    },
                    {
                        content: `Type "Abstract" into the "Condition" field, and then click the checkmark icon to confirm and create a row.`,
                        initCall: {
                            context: "home",
                            type: "function",
                            id: "insert-copy-to-clipboard-buttons",
                            args: ["Abstract"]
                        },
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-design-conditions-row1-condition", "value", "Abstract"]
                        }
                    },
                    {
                        content: `Type "Abstract" into the "Condition" field, and then click the checkmark icon to confirm and create a row.`,
                        initCall: {
                            context: "home",
                            type: "function",
                            id: "insert-copy-to-clipboard-buttons",
                            args: ["Abstract"]
                        },
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-stepper-design-conditions-row1-confirm"
                        }
                    },
                    {
                        content: `Click "Add Condition" again to add another condition.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-stepper-design-add-condition-button"
                        }
                    },
                    {
                        content: `Type "Concrete" into the "Condition" field, and then click the checkmark icon to confirm and create a row.`,
                        initCall: {
                            context: "home",
                            type: "function",
                            id: "insert-copy-to-clipboard-buttons",
                            args: ["Concrete"]
                        },
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-design-conditions-row2-condition", "value", "Concrete"]
                        }
                    },
                    {
                        content: `Type "Concrete" into the "Condition" field, and then click the checkmark icon to confirm and create a row.`,
                        initCall: {
                            context: "home",
                            type: "function",
                            id: "insert-copy-to-clipboard-buttons",
                            args: ["Concrete"]
                        },
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-stepper-design-conditions-row2-confirm"
                        }
                    },
                    {
                        content: `Now we have defined a decision point and conditions.<br><br>Click the "Next" button at the bottom to move to the next step.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-stepper-design-next-button"
                        }
                    }
                ]
            },
            {
                context: "upgrade",
                title: "Complete the Participants Step",
                substeps: [
                    {
                        content: `Here you can define a list of participants to include or exclude.<br><br>Click "Add Member" to add a member.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-stepper-participants-add-member-button"
                        }
                    },
                    {
                        content: `Click on the "Type" drop-down and select "All."`,
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-participants-include-row1-type", "innerText", "All"]
                        }
                    },
                    {
                        content: `Click the "Next" button at the bottom to move to the next step.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-stepper-participants-next-button"
                        }
                    }
                ]
            },
            {
                context: "upgrade",
                title: "Complete the Metrics Step",
                substeps: [
                    {
                        content: `Let's define the metrics for this experiment.<br><br>Click "Add Metric" to add a metric.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-stepper-metrics-add-metric-button"
                        }
                    },
                    {
                        content: `Type "durationSeconds" into the "Metric" field, and click on the "Statistic" drop-down and select "Mean."`,
                        initCall: {
                            context: "home",
                            type: "function",
                            id: "insert-copy-to-clipboard-buttons",
                            args: ["durationSeconds"]
                        },
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-metrics-metrics-row1-metric", "value", "durationSeconds"]
                        }
                    },
                    {
                        content: `Type "durationSeconds" into the "Metric" field, and click on the "Statistic" drop-down and select "Mean."`,
                        initCall: {
                            context: "home",
                            type: "function",
                            id: "insert-copy-to-clipboard-buttons",
                            args: ["durationSeconds"]
                        },
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-metrics-metrics-row1-statistic", "innerText", "Mean"]
                        }
                    },
                    {
                        content: `Type "Duration in Seconds (Mean)" into the "Display Name" field, and then click "Add Metric" again to add another metric."`,
                        initCall: {
                            context: "home",
                            type: "function",
                            id: "insert-copy-to-clipboard-buttons",
                            args: ["Duration in Seconds (Mean)"]
                        },
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-metrics-metrics-row1-display-name", "value", "Duration in Seconds (Mean)"]
                        }
                    },
                    {
                        content: `Type "Duration in Seconds (Mean)" into the "Display Name" field, and then click "Add Metric" again to add another metric."`,
                        initCall: {
                            context: "home",
                            type: "function",
                            id: "insert-copy-to-clipboard-buttons",
                            args: ["Duration in Seconds (Mean)"]
                        },
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-stepper-metrics-add-metric-button"
                        }
                    },
                    {
                        content: `Type "percentCorrect" into the "Metric" field, and click on the "Statistic" drop-down and select "Mean."`,
                        initCall: {
                            context: "home",
                            type: "function",
                            id: "insert-copy-to-clipboard-buttons",
                            args: ["percentCorrect"]
                        },
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-metrics-metrics-row2-metric", "value", "percentCorrect"]
                        }
                    },
                    {
                        content: `Type "percentCorrect" into the "Metric" field, and click on the "Statistic" drop-down and select "Mean."`,
                        initCall: {
                            context: "home",
                            type: "function",
                            id: "insert-copy-to-clipboard-buttons",
                            args: ["percentCorrect"]
                        },
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-metrics-metrics-row2-statistic", "innerText", "Mean"]
                        }
                    },
                    {
                        content: `Type "Percent Correct (Mean)" into the "Display Name" field."`,
                        initCall: {
                            context: "home",
                            type: "function",
                            id: "insert-copy-to-clipboard-buttons",
                            args: ["Percent Correct (Mean)"]
                        },
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-metrics-metrics-row2-display-name", "value", "Percent Correct (Mean)"]
                        }
                    },
                    {
                        content: `Now we have defined the metrics.<br><br>Click the "Next" button at the bottom to move to the next step.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-stepper-metrics-next-button"
                        }
                    }
                ]
            },
            {
                context: "upgrade",
                title: "Complete the Schedule Step",
                substeps: [
                    {
                        content: `Here you can schedule the experiment to start and end at a specific date and time.<br><br>Click the "Next" button at the bottom to move to the final step.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-stepper-schedule-next-button"
                        }
                    }
                ]
            },
            {
                context: "upgrade",
                title: "Complete the Post Rule Step",
                substeps: [
                    {
                        content: `Here you can define what condition the partipants will see after the experiment ends.<br><br>Click on the "Post Rule" drop-down and select "Continue" to make the participants continue getting the assigned condition even after the experiment ends.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["experiment-stepper-post-rule-post-rule", "innerText", "Continue"]
                        }
                    },
                    {
                        content: `Click the "Create" button at the bottom to create the experiment.`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-stepper-post-rule-create-button"
                        }
                    }
                ]
            },
            {
                context: "upgrade",
                title: "Start the Experiment",
                substeps: [
                    {
                        content: `You have now created an experiment in UpGrade.<br><br>The experiment is defined but it is not running.<br><br>To activate it, click on the word "Inactive" under "STATUS."`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "experiment-details-overview-status"
                        }
                    },
                    {
                        content: `To start running the experiment, set the New Status "Enrolling" and then click "SAVE."`,
                        nextCallback: {
                            context: "upgrade",
                            type: "function",
                            id: "on-value-match",
                            args: ["change-experiment-status-modal-new-status", "innerText", "Enrolling"]
                        }
                    },
                    {
                        content: `To start running the experiment, set the New Status "Enrolling" and then click "SAVE."`,
                        nextCallback: {
                            context: "upgrade",
                            type: "click",
                            id: "change-experiment-status-modal-save-button"
                        }
                    },
                    {
                        content: `Now we have set up and started an experiment in UpGrade.<br><br>Feel free to log into QuizApp to see if you get the "Concrete" or "Abstract" condition. You can come back to the experiment details page and see the results on the "Data" tab.`,
                        buttonTexts: ["Finish Experiment UI Tour"]
                    }
                ]
            }
        ]
    }
];