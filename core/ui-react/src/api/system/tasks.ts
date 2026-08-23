import {z} from "zod";

import {ApiTransport} from "../transport";

const TASKS_PATH = "internalapi/tasks";

/**
 * `HydraTaskScheduler.TaskInformation`: a task's name plus its last and next
 * execution `Instant`s. Both instants are optional in the generated schema
 * ("last" is genuinely absent until the task has run once) and are accepted
 * as a string or a number because a Jackson `Instant` is serialized as either
 * an ISO timestamp or an epoch value depending on the mapper's date
 * configuration, the same latitude `C-DATE-TIME` reads elsewhere.
 */
const taskInformationSchema = z.looseObject({
    lastExecutionTime: z.union([z.string(), z.number()]).nullish(),
    name: z.string().nullish(),
    nextExecutionTime: z.union([z.string(), z.number()]).nullish(),
});

const tasksListSchema = z.array(taskInformationSchema);

export type SystemTask = {
    lastExecutionTime: string | number | null;
    name: string;
    nextExecutionTime: string | number | null;
};

export class MalformedTasksResponseError extends Error {
    constructor() {
        super("The tasks response has an invalid format");
    }
}

function toTasks(data: unknown): SystemTask[] {
    const parsed = tasksListSchema.safeParse(data);
    if (!parsed.success) {
        throw new MalformedTasksResponseError();
    }
    // A task without a name cannot be run (the PUT path is built from it) or
    // usefully displayed, so it is dropped rather than rendered unusable.
    return parsed.data
        .filter(
            (task): task is typeof task & {name: string} =>
                typeof task.name === "string",
        )
        .map((task) => ({
            lastExecutionTime: task.lastExecutionTime ?? null,
            name: task.name,
            nextExecutionTime: task.nextExecutionTime ?? null,
        }));
}

/**
 * `API-SYSTEM-TASKS`: the scheduled tasks (`HydraTasksWeb.getTasks`), already
 * sorted by next execution time server-side; that order is kept as the
 * display order.
 */
export async function getTasks(transport: ApiTransport): Promise<SystemTask[]> {
    return toTasks(await transport.request<unknown>(TASKS_PATH));
}

/**
 * `API-SYSTEM-TASK-RUN`: runs one task now (`HydraTasksWeb.runTask`) and
 * answers with the whole refreshed list, the same as the GET -- legacy's
 * `runTask` (`tasks.js:15-19`) assigns the response straight over `$scope.tasks`
 * rather than issuing a second GET, and this does the same.
 */
export async function runTask(
    transport: ApiTransport,
    taskName: string,
): Promise<SystemTask[]> {
    return toTasks(
        await transport.request<unknown>(
            `${TASKS_PATH}/${encodeURIComponent(taskName)}`,
            {method: "PUT"},
        ),
    );
}
