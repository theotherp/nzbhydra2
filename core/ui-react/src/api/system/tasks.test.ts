import {describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../transport";
import {
    getTasks,
    MalformedTasksResponseError,
    runTask,
    type SystemTask,
} from "./tasks";

function jsonTransport(body: unknown, status = 200) {
    const fetchImplementation = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(body), {
            headers: {"Content-Type": "application/json"},
            status,
        }),
    );
    return {
        fetchImplementation,
        transport: new ApiTransport("/hydra/", fetchImplementation),
    };
}

describe("tasks API", () => {
    it("should keep the server's order and drop a task without a name", async () => {
        const {transport, fetchImplementation} = jsonTransport([
            {
                lastExecutionTime: "2026-08-20T10:00:00Z",
                name: "Backup",
                nextExecutionTime: "2026-08-21T10:00:00Z",
            },
            {
                lastExecutionTime: null,
                name: "Delete old search results",
                nextExecutionTime: 1755700000,
            },
            {lastExecutionTime: null, nextExecutionTime: null},
        ]);

        const expected: SystemTask[] = [
            {
                lastExecutionTime: "2026-08-20T10:00:00Z",
                name: "Backup",
                nextExecutionTime: "2026-08-21T10:00:00Z",
            },
            {
                lastExecutionTime: null,
                name: "Delete old search results",
                nextExecutionTime: 1755700000,
            },
        ];
        await expect(getTasks(transport)).resolves.toEqual(expected);
        expect(fetchImplementation.mock.calls[0][0]).toBe(
            "http://localhost:3000/hydra/internalapi/tasks",
        );
    });

    it("should reject a tasks list that is not a list", async () => {
        const {transport} = jsonTransport({tasks: []});

        await expect(getTasks(transport)).rejects.toBeInstanceOf(
            MalformedTasksResponseError,
        );
    });

    it("should reject a failing GET status", async () => {
        const {transport} = jsonTransport({message: "denied"}, 403);

        await expect(getTasks(transport)).rejects.toThrow();
    });

    it("should PUT a task by name and replace the list with the response, not re-GET", async () => {
        const {transport, fetchImplementation} = jsonTransport([
            {
                lastExecutionTime: "2026-08-22T09:00:00Z",
                name: "Backup",
                nextExecutionTime: "2026-08-23T09:00:00Z",
            },
        ]);

        await expect(runTask(transport, "Backup")).resolves.toEqual([
            {
                lastExecutionTime: "2026-08-22T09:00:00Z",
                name: "Backup",
                nextExecutionTime: "2026-08-23T09:00:00Z",
            },
        ]);
        expect(fetchImplementation).toHaveBeenCalledTimes(1);
        expect(fetchImplementation.mock.calls[0][0]).toBe(
            "http://localhost:3000/hydra/internalapi/tasks/Backup",
        );
        expect(fetchImplementation.mock.calls[0][1]?.method).toBe("PUT");
    });

    it("should encode a task name with special characters into the path", async () => {
        const {transport, fetchImplementation} = jsonTransport([]);

        await runTask(transport, "Clean up/indexer statuses");

        expect(fetchImplementation.mock.calls[0][0]).toBe(
            "http://localhost:3000/hydra/internalapi/tasks/Clean%20up%2Findexer%20statuses",
        );
    });

    it("should reject a failing run status", async () => {
        const {transport} = jsonTransport({message: "denied"}, 403);

        await expect(runTask(transport, "Backup")).rejects.toThrow();
    });
});
