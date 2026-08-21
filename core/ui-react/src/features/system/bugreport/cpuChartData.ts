import type {ThreadCpuSeries} from "../../../api/system/debug";
import {parseServerDateTime} from "../../../domain/date-time/dateTime";

export type CpuChartSeries = {
    label: string;
    /** One value per entry of `times`; `null` where the thread had no sample. */
    data: (number | null)[];
};

export type CpuChartData = {
    series: CpuChartSeries[];
    /** Epoch millis, ascending; the shared category axis. */
    times: number[];
};

/**
 * The per-thread samples arranged onto one shared time axis. The server builds
 * each series from the same recorded snapshots but drops a thread that never
 * reached 1% CPU in *any* of them (`DebugInfosWeb:146`), so the series do not
 * all cover the same instants and a missing sample stays a gap rather than
 * being drawn as zero usage.
 */
export function cpuChartData(
    threadSeries: ThreadCpuSeries[],
    serverTimeZone: string | null,
): CpuChartData {
    const byLabel = threadSeries.map((series) => {
        const values = new Map<number, number>();
        for (const point of series.points) {
            const parsed = parseServerDateTime(point.time, serverTimeZone);
            if (parsed) {
                values.set(parsed.getTime(), point.value);
            }
        }
        return {label: series.label, values};
    });
    const times = [
        ...new Set(byLabel.flatMap((series) => [...series.values.keys()])),
    ].sort((left, right) => left - right);
    return {
        series: byLabel.map((series) => ({
            data: times.map((time) => series.values.get(time) ?? null),
            label: series.label,
        })),
        times,
    };
}

/**
 * Legacy's axis tick format (`system-controller.js:196-198`): the clock time in
 * the *server's* zone, so a sample reads the same as the log line that
 * recorded it, not as the browser's local wall clock.
 */
export function formatChartTime(
    time: number,
    serverTimeZone: string | null,
): string {
    try {
        return new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            hourCycle: "h23",
            minute: "2-digit",
            second: "2-digit",
            timeZone: serverTimeZone ?? undefined,
        }).format(new Date(time));
    } catch {
        return "";
    }
}

/** The most recent sample per thread: the chart's accessible-table rendering. */
export function latestCpuValues(
    data: CpuChartData,
): {label: string; time: number; value: number}[] {
    const rows: {label: string; time: number; value: number}[] = [];
    for (const series of data.series) {
        for (let index = data.times.length - 1; index >= 0; index--) {
            const value = series.data[index];
            if (value !== null && value !== undefined) {
                rows.push({
                    label: series.label,
                    time: data.times[index],
                    value,
                });
                break;
            }
        }
    }
    return rows.sort((left, right) => right.value - left.value);
}
