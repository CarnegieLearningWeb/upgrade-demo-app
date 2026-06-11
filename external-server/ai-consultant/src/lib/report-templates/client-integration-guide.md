This section shows how to connect your client application to UpGrade for the experiment described in this report.

The generated snippets are intended as a concrete starting point. The experiment values are pre-filled from this report; connect the user ID and implement the condition-specific client behavior in your app.

At a high level, the client app should:

1. Initialize the UpGrade client for the current user.
2. Request an assignment when the user reaches the configured decision point.
3. Apply the client-side experience for the assigned condition.
4. Mark whether the assigned condition was applied.
5. Log metric values when the relevant outcomes are known.

### JavaScript Client Library

Use this option if your client app runs plain JavaScript in the browser and loads the UpGrade client library with a `<script>` tag.

Add the UpGrade client library to your HTML page:

```html
<script src="https://cdn.jsdelivr.net/npm/upgrade_client_lib@6.4.0/dist/browser/index.min.js"></script>
```

Then add the reusable helper functions below. These helpers keep the UpGrade flow in one place, while the experiment-specific values are passed in from the usage example.

```js
async function visitDecisionPoint({
  userId,
  hostUrl,
  appContext,
  site,
  target,
  conditionHandlers,
  defaultHandler,
}) {
  const upClient = new UpgradeClient(userId, hostUrl, appContext);

  await upClient.init();

  const assignment = await upClient.getDecisionPointAssignment(site, target);
  const condition = assignment.getCondition();

  const conditionHandler = condition ? conditionHandlers[condition] : null;
  const handler = conditionHandler || defaultHandler;

  if (handler) {
    await handler();
  }

  const markStatus = condition
    ? conditionHandler
      ? "condition applied"
      : "condition not applied"
    : "no condition assigned";

  assignment.markDecisionPoint(markStatus);

  return { upClient, assignment, condition, markStatus };
}

async function logMetrics(upClient, attributes) {
  await upClient.log([
    {
      timestamp: new Date().toISOString(),
      metrics: {
        attributes,
      },
    },
  ]);
}
```

Call the helper from the part of your app where the user reaches the decision point. Run this from an async function or module context so `await` can be used. Replace `userIdFromYourApp()` with the code your app uses to read the current user's stable ID.

```js
const { upClient, condition, markStatus } = await visitDecisionPoint({
  userId: userIdFromYourApp(),
  hostUrl: "http://localhost:3030",
  appContext: "{{app_context}}",
  site: "{{site}}",
  target: "{{target}}",
  conditionHandlers: {
{{condition_handlers_block}}
  },
  defaultHandler: () => {
    // Apply the default experience when no condition is assigned or no matching condition handler is found.
  },
});
```

When the metric outcomes are known, log them with the same UpGrade client instance. Replace the example metric value functions with the code your app uses to compute or read each outcome.

```js
await logMetrics(upClient, {
{{metric_attrs_block}}
});
```

### TypeScript Client Library

Use this option if your client app uses TypeScript and installs the UpGrade client library through npm.

The TypeScript version follows the same flow as the JavaScript version, but uses imports and explicit types so the integration is easier to validate in a TypeScript codebase.

Install the client library:

```bash
npm install upgrade_client_lib@6.4.0
```

Import the UpGrade client and related types:

```ts
import UpgradeClient, {
  Assignment,
  ILogInput,
  MARKED_DECISION_POINT_STATUS,
} from "upgrade_client_lib";
```

Then add the reusable typed helper functions below. These helpers match the JavaScript version, but add types for the input config, condition handlers, metric attributes, and return value.

```ts
type ConditionHandler = () => void | Promise<void>;

type VisitDecisionPointParams = {
  userId: string;
  hostUrl: string;
  appContext: string;
  site: string;
  target: string;
  conditionHandlers: Record<string, ConditionHandler>;
  defaultHandler?: ConditionHandler;
};

type VisitDecisionPointResult = {
  upClient: UpgradeClient;
  assignment: Assignment;
  condition: string | null;
  markStatus: MARKED_DECISION_POINT_STATUS;
};

type MetricAttributes = Record<string, string | number | boolean | null>;

async function visitDecisionPoint({
  userId,
  hostUrl,
  appContext,
  site,
  target,
  conditionHandlers,
  defaultHandler,
}: VisitDecisionPointParams): Promise<VisitDecisionPointResult> {
  const upClient = new UpgradeClient(userId, hostUrl, appContext);

  await upClient.init();

  const assignment = await upClient.getDecisionPointAssignment(site, target);
  const condition = assignment.getCondition();

  const conditionHandler = condition ? conditionHandlers[condition] : null;
  const handler = conditionHandler || defaultHandler;

  if (handler) {
    await handler();
  }

  const markStatus = condition
    ? conditionHandler
      ? MARKED_DECISION_POINT_STATUS.CONDITION_APPLIED
      : MARKED_DECISION_POINT_STATUS.CONDITION_FAILED_TO_APPLY
    : MARKED_DECISION_POINT_STATUS.NO_CONDITION_ASSIGNED;

  assignment.markDecisionPoint(markStatus);

  return { upClient, assignment, condition, markStatus };
}

async function logMetrics(
  upClient: UpgradeClient,
  attributes: MetricAttributes
): Promise<void> {
  const metrics: ILogInput[] = [
    {
      timestamp: new Date().toISOString(),
      metrics: {
        attributes,
        groupedMetrics: [],
      },
    },
  ];

  await upClient.log(metrics);
}
```

Call the helper from the part of your app where the user reaches the decision point. Run this from an async function or module context so `await` can be used. Replace `userIdFromYourApp()` with the code your app uses to read the current user's stable ID.

```ts
const { upClient, condition, markStatus } = await visitDecisionPoint({
  userId: userIdFromYourApp(),
  hostUrl: "http://localhost:3030",
  appContext: "{{app_context}}",
  site: "{{site}}",
  target: "{{target}}",
  conditionHandlers: {
{{condition_handlers_block}}
  },
  defaultHandler: () => {
    // Apply the default experience when no condition is assigned or no matching condition handler is found.
  },
});
```

When the metric outcomes are known, log them with the same UpGrade client instance. Replace the example metric value functions with the code your app uses to compute or read each outcome.

```ts
await logMetrics(upClient, {
{{metric_attrs_block}}
});
```

### Developer Notes

* Use a stable per-user identifier from your application for `userId`. Do not hard-code a test user ID in production.
* The `appContext`, `site`, `target`, condition codes, and metric keys must exactly match the values configured in UpGrade.
* The default experience should be safe to apply when no condition is assigned or no matching condition handler is found.
* If the UpGrade request fails, the app should fall back to the default experience. The snippets above keep error handling minimal for readability, so add request-level error handling before using this in production.
* Metric logging should happen when the outcome is known, not necessarily immediately after the decision point is visited.
* Review this integration before using it in production.
