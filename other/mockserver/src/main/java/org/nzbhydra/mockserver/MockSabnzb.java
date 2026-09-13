package org.nzbhydra.mockserver;

import jakarta.servlet.http.HttpServletRequest;
import org.nzbhydra.downloading.downloaders.sabnzbd.mapping.History;
import org.nzbhydra.downloading.downloaders.sabnzbd.mapping.HistoryResponse;
import org.nzbhydra.downloading.downloaders.sabnzbd.mapping.Queue;
import org.nzbhydra.downloading.downloaders.sabnzbd.mapping.QueueResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.MapperFeature;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.json.JsonMapper;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

@SuppressWarnings("unchecked")
@RestController
public class MockSabnzb {

    public static final String INVALID_API_KEY = "mock-invalid-api-key";
    public static final String UNAVAILABLE_API_KEY = "mock-unavailable-api-key";

    private final AtomicReference<Map<String, Object>> lastAddRequest = new AtomicReference<>();

    @RequestMapping(value = "/sabnzbd/api", method = {RequestMethod.POST, RequestMethod.GET})
    public ResponseEntity<Map<String, Object>> api(@RequestParam("mode") String mode,
                                                   @RequestParam(value = "apikey", required = false) String apiKey,
                                                   @RequestParam(value = "name", required = false) MultipartFile file,
                                                   HttpServletRequest request) throws Exception {
        if (INVALID_API_KEY.equals(apiKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "authentication failed"));
        }
        if (UNAVAILABLE_API_KEY.equals(apiKey)) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("error", "service unavailable"));
        }

        Map<String, Object> response = new HashMap<>();
        if (mode.equals("addfile")) {
            recordAddRequest(apiKey, file, request);
            response.put("status", true);
            response.put("nzo_ids", Collections.singletonList("SABnzdnd_nzo_upload_1234"));
        } else if (mode.equals("addurl")) {
            response.put("status", true);
            response.put("nzo_ids", Collections.singletonList("SABnzdnd_nzo_1234"));
        } else if (mode.equals("get_cats")) {
            response.put("categories", Arrays.asList("*", "movies", "series", "tv"));
        } else if (mode.equals("queue")) {
            QueueResponse queueResponse = new QueueResponse();
            final Queue queue = new Queue();
            queue.setPaused(false);
            queue.setStatus("Downloading");
            queueResponse.setQueue(queue);
            response = new ObjectMapper().convertValue(queueResponse, Map.class);
        } else if (mode.equals("history")) {
            HistoryResponse historyResponse = new HistoryResponse();
            final History history = new History();
            history.setSlots(Collections.emptyList());
            historyResponse.setHistory(history);
            response = new ObjectMapper().convertValue(historyResponse, Map.class);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/sabnzbd/recording/reset")
    public Map<String, Object> resetRecording() {
        lastAddRequest.set(null);
        return Map.of("successful", true);
    }

    @RequestMapping("/sabnzbd/recording")
    public Map<String, Object> recording() {
        Map<String, Object> recordedRequest = lastAddRequest.get();
        return recordedRequest == null ? Map.of() : recordedRequest;
    }

    private void recordAddRequest(String apiKey, MultipartFile file, HttpServletRequest request) throws Exception {
        Map<String, Object> recordedRequest = new LinkedHashMap<>();
        Map<String, String> queryParameters = new LinkedHashMap<>();
        request.getParameterMap().forEach((key, value) -> queryParameters.put(key, value.length == 0 ? null : value[0]));
        recordedRequest.put("queryParameters", queryParameters);
        recordedRequest.put("multipartFilename", file == null ? null : file.getOriginalFilename());
        recordedRequest.put("multipartContent", file == null ? null : new String(file.getBytes(), java.nio.charset.StandardCharsets.UTF_8));
        recordedRequest.put("apiKey", apiKey);
        recordedRequest.put("method", request.getMethod());
        lastAddRequest.set(recordedRequest);
    }


    @Configuration
    public class JacksonConfiguration {

        @Bean
        public JsonMapper objectMapper() {
            return JsonMapper.builder()
                    .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                    .enable(MapperFeature.DEFAULT_VIEW_INCLUSION)
                    .enable(SerializationFeature.INDENT_OUTPUT)
                    .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
                    .build();
        }
    }
}
