package org.nzbhydra.mockserver;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

@RestController
public class MockTorbox {

    private static final AtomicReference<Map<String, String>> LAST_TORRENT_REQUEST = new AtomicReference<>();

    @PostMapping(value = "/torbox/v1/api/torrents/createtorrent", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> createTorrent(@RequestParam(value = "file", required = false) MultipartFile file,
                                             @RequestParam(value = "magnet", required = false) String magnet,
                                             @RequestParam(value = "name", required = false) String name,
                                             @RequestParam(value = "category", required = false) String category) throws IOException {
        Map<String, String> request = new LinkedHashMap<>();
        request.put("name", name);
        request.put("magnet", magnet);
        request.put("category", category);
        request.put("file", file == null ? null : new String(file.getBytes(), StandardCharsets.UTF_8));
        LAST_TORRENT_REQUEST.set(request);
        //Shaped like the real answer to a torrent add: a hash and a torrent ID. Core reads the hash as the download ID and
        //rejects a success without either, so answering with a usenetdownload_id here fails the torrent system test.
        return Map.of("success", true, "error", "", "detail", "Torrent Added Successfully",
            "data", Map.of("hash", "mock-torrent-hash-123", "torrent_id", 123, "auth_id", "mock-auth"));
    }

    @GetMapping("/torbox/recording")
    public Map<String, String> recording() {
        Map<String, String> request = LAST_TORRENT_REQUEST.get();
        return request == null ? Map.of() : request;
    }
}
