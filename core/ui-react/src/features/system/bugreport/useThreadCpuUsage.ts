import {useEffect, useState} from "react";

import {
    getThreadCpuUsage,
    type ThreadCpuSeries,
} from "../../../api/system/debug";
import {ApiTransport} from "../../../api/transport";

/** Legacy's poll interval (`system-controller.js:237-239`). */
export const CPU_POLL_INTERVAL_MS = 5000;

export type ThreadCpuUsageState = {
    /** True once a poll failed and polling was therefore given up. */
    stopped: boolean;
    threadSeries: ThreadCpuSeries[];
};

/**
 * The CPU chart's data source: one immediate read and then a poll every five
 * seconds, kept out of TanStack Query because legacy's rule here is *stop*
 * rather than retry — a failing poll (an instance that went away, a session
 * that lost its admin role) ends the polling instead of repeating a request
 * that will keep failing (`system-controller.js:211-245`). The interval is
 * cleared on unmount either way.
 */
export function useThreadCpuUsage(
    transport: ApiTransport,
): ThreadCpuUsageState {
    const [threadSeries, setThreadSeries] = useState<ThreadCpuSeries[]>([]);
    const [stopped, setStopped] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const poll = async () => {
            try {
                const next = await getThreadCpuUsage(transport);
                if (!cancelled) {
                    setThreadSeries(next);
                }
            } catch {
                clearInterval(timer);
                if (!cancelled) {
                    setStopped(true);
                }
            }
        };
        // Registered before the first read so a failing first poll already has
        // an interval to clear; legacy's order (`system-controller.js:236-239`)
        // has the same effect because its first read is asynchronous too.
        const timer = setInterval(() => void poll(), CPU_POLL_INTERVAL_MS);
        void poll();
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [transport]);

    return {stopped, threadSeries};
}
