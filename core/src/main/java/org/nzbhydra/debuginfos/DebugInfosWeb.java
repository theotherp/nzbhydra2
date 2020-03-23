package org.nzbhydra.debuginfos;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.logging.LogContentProvider;
import org.nzbhydra.logging.LogContentProvider.JsonLogResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
public class DebugInfosWeb {

    private static final Pattern NIO_THREAD_PATTERN = Pattern.compile("http-nio-[\\d\\.]*-\\d{1,6}-exec-(\\d)");

    @Autowired
    private LogContentProvider logContentProvider;
    @Autowired
    private org.nzbhydra.debuginfos.DebugInfosProvider debugInfos;

    private static final Logger logger = LoggerFactory.getLogger(DebugInfosWeb.class);

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/debuginfos/currentlogfile", method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
    public FileSystemResource getCurrentLogFile() {
        return new FileSystemResource(logContentProvider.getCurrentLogfile(false));
    }


    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/debuginfos/downloadlog", method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
    public FileSystemResource downloadLogFile(@RequestParam String logfilename) throws IOException {
        File file = new File(new File(NzbHydra.getDataFolder(), "logs"), logfilename);
        if (!file.getCanonicalPath().startsWith(new File(NzbHydra.getDataFolder()).getCanonicalPath())) {
            throw new IOException("Log file not in data folder");
        }
        return new FileSystemResource(file);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/debuginfos/logfilenames", method = RequestMethod.GET)
    public List<String> getLogFilenames() {
        return logContentProvider.getLogFileNames();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/debuginfos/jsonlogs", method = RequestMethod.GET)
    public ResponseEntity<JsonLogResponse> logsAsJson(@RequestParam(required = false) Integer offset, @RequestParam(required = false) Integer limit) {
        try {
            JsonLogResponse jsonObjects = logContentProvider.getLogsAsJsonLines(offset == null ? 0 : offset, limit == null ? 500 : limit);
            return ResponseEntity.ok(jsonObjects);
        } catch (IOException e) {
            logger.error("Error while getting log file content", e);
            return ResponseEntity.status(500).build();
        }
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/debuginfos/logandconfig", produces = "application/zip", method = RequestMethod.GET)
    public byte[] logAndInfosAsZip() throws IOException {
        try {
            return debugInfos.getDebugInfosAsZip();
        } catch (IOException e) {
            logger.error("Error while getting debug infos", e);
            throw e;
        }
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/debuginfos/threadCpuUsage", produces = MediaType.APPLICATION_JSON_VALUE, method = RequestMethod.GET)
    public List<ThreadCpuUsageChartData> getThreadCpuUsageChartData() throws IOException {
        Map<String, List<TimeAndValue>> map = new HashMap<>();
        List<ThreadCpuUsageChartData> list = new ArrayList<>();
        final List<DebugInfosProvider.TimeAndThreadCpuUsages> chartData = debugInfos.getThreadCpuUsageChartData();
        for (DebugInfosProvider.TimeAndThreadCpuUsages entry : chartData) {
            for (DebugInfosProvider.ThreadCpuUsage threadCpuUsage : entry.getThreadCpuUsages()) {
                if (!map.containsKey(threadCpuUsage.getThreadName())) {
                    map.put(threadCpuUsage.getThreadName(), new ArrayList<>());
                }
                map.get(threadCpuUsage.getThreadName()).add(new TimeAndValue(entry.getTime(), threadCpuUsage.getCpuUsage()));
            }
        }
        for (Map.Entry<String, List<TimeAndValue>> entry : map.entrySet()) {
            if (entry.getValue().stream().allMatch(x -> x.getValue() < 1)) {
                continue;
            }
            list.add(new ThreadCpuUsageChartData(entry.getKey(), entry.getValue().stream().sorted(Comparator.comparing(x -> x.time)).collect(Collectors.toList())));
        }
        return list;
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/debuginfos/logThreadDump")
    public void logThreadDump() {
        debugInfos.logThreadDump();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/debuginfos/executesqlquery", method = RequestMethod.POST)
    public GenericResponse executeSqlQuery(@RequestBody String sql) throws IOException {
        try {
            return GenericResponse.ok(debugInfos.executeSqlQuery(sql));
        } catch (IOException e) {
            logger.error("Error while executing SQL", e);
            return GenericResponse.notOk("Error while executing SQL " + e.getMessage());
        }
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/debuginfos/executesqlupdate", method = RequestMethod.POST)
    public GenericResponse executeSqlUpdate(@RequestBody String sql) throws IOException {
        try {
            return GenericResponse.ok(debugInfos.executeSqlUpdate(sql));
        } catch (IOException e) {
            logger.error("Error while executing SQL", e);
            return GenericResponse.notOk("Error while executing SQL " + e.getMessage());
        }
    }

    @Data
    public static class ThreadCpuUsageChartData {
        private final String key;
        private final List<TimeAndValue> values;

        public ThreadCpuUsageChartData(String key, List<TimeAndValue> values) {
            final Matcher matcher = NIO_THREAD_PATTERN.matcher(key);
            if (matcher.matches()) {
                this.key = "HTTP thread #" + matcher.group(1);
            } else {
                this.key = key;
            }
            this.values = values;
        }
    }

    @Data
    @AllArgsConstructor
    public static class TimeAndValue {
        private final Instant time;
        private final float value;
    }


}
