package org.nzbhydra.mockserver;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

@RestController
@SuppressWarnings("unchecked")
public class MockNzbGet {

    public static final int NZB_ID = 4242;

    private final AtomicReference<State> state = new AtomicReference<>(new State());
    private final AtomicReference<List<Map<String, Object>>> recordings = new AtomicReference<>(new ArrayList<>());
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping(value = "/nzbget/jsonrpc", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> jsonRpc(@RequestBody String rawRequest, HttpServletRequest httpRequest) {
        Map<String, Object> request = objectMapper.readValue(rawRequest, Map.class);
        String method = (String) request.get("method");
        record(method, request.get("params"), httpRequest, rawRequest);

        State currentState = state.get();
        if ("malformed".equals(currentState.mode)) {
            return ResponseEntity.ok("not valid json");
        }
        if ("error".equals(currentState.mode)) {
            return ResponseEntity.ok(response(request.get("id"), "error", Map.of("code", -1, "message", method + " failed")));
        }

        Object result = switch (method) {
            case "writelog" -> true;
            case "append" -> NZB_ID;
            case "status" -> status();
            case "listgroups" -> groups(currentState);
            case "history" -> history(currentState);
            case "config" -> List.of(Map.of("Name", "Category1.Name", "Value", "nzbget"));
            default -> null;
        };
        return ResponseEntity.ok(response(request.get("id"), "result", result));
    }

    @PostMapping("/nzbget/reset")
    public Map<String, Object> reset() {
        state.set(new State());
        recordings.set(new ArrayList<>());
        return Map.of("successful", true);
    }

    @PostMapping("/nzbget/state")
    public Map<String, Object> setState(@RequestBody Map<String, Object> requestedState) {
        State next = new State();
        next.mode = String.valueOf(requestedState.getOrDefault("mode", "normal"));
        next.queueNzbId = number(requestedState.get("queueNzbId"));
        next.historyNzbId = number(requestedState.get("historyNzbId"));
        next.nzbName = String.valueOf(requestedState.getOrDefault("nzbName", "Hydra NZBGet Queue Item.nzb"));
        state.set(next);
        return Map.of("successful", true);
    }

    @RequestMapping("/nzbget/recording")
    public Map<String, Object> recording() {
        return Map.of("calls", recordings.get());
    }

    private Map<String, Object> response(Object id, String key, Object value) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("jsonrpc", "2.0");
        response.put(key, value);
        response.put("id", id);
        return response;
    }

    private Map<String, Object> status() {
        return Map.of(
                "RemainingSizeMB", 200,
                "PausedSizeMB", 20,
                "DownloadRate", 20 * 1024,
                "DownloadPaused", false,
                "ForcedSizeMB", 0
        );
    }

    private List<Map<String, Object>> groups(State currentState) {
        if (currentState.queueNzbId == null) {
            return List.of();
        }
        return List.of(Map.of(
                "Kind", "NZB",
                "NZBID", currentState.queueNzbId,
                "NZBName", currentState.nzbName,
                "Status", "DOWNLOADING",
                "FileSizeMB", 100,
                "PausedSizeMB", 20,
                "RemainingSizeMB", 60
        ));
    }

    private List<Map<String, Object>> history(State currentState) {
        if (currentState.historyNzbId == null) {
            return List.of();
        }
        return List.of(Map.of(
                "Kind", "NZB",
                "NZBID", currentState.historyNzbId,
                "NZBName", currentState.nzbName,
                "Status", "SUCCESS/ALL",
                "HistoryTime", Instant.now().getEpochSecond()
        ));
    }

    private void record(String method, Object parameters, HttpServletRequest request, String rawRequest) {
        Map<String, Object> recording = new LinkedHashMap<>();
        recording.put("method", method);
        recording.put("parameters", parameters);
        recording.put("authorization", request.getHeader("Authorization"));
        recording.put("httpMethod", request.getMethod());
        recording.put("rawRequest", rawRequest);
        synchronized (this) {
            List<Map<String, Object>> updated = new ArrayList<>(recordings.get());
            updated.add(recording);
            recordings.set(updated);
        }
    }

    private Integer number(Object value) {
        return value == null ? null : ((Number) value).intValue();
    }

    private static class State {
        private String mode = "normal";
        private Integer queueNzbId;
        private Integer historyNzbId;
        private String nzbName = "Hydra NZBGet Queue Item.nzb";
    }
}
