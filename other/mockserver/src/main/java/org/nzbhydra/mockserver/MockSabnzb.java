package org.nzbhydra.mockserver;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import org.nzbhydra.downloading.downloaders.sabnzbd.mapping.Queue;
import org.nzbhydra.downloading.downloaders.sabnzbd.mapping.QueueResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@SuppressWarnings("unchecked")
@RestController
public class MockSabnzb {


    @RequestMapping(value = "/sabnzbd/api", method = {RequestMethod.POST, RequestMethod.GET})
    public Map<String, Object> api(@RequestParam("mode") String mode) throws Exception {
        Map<String, Object> response = new HashMap<>();
        if (mode.equals("addurl")) {
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
        }
        return response;
    }


    @Configuration
    public class JacksonConfiguration {

        @Bean
        public ObjectMapper objectMapper() {
            ObjectMapper mapper = new ObjectMapper();
            mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
            mapper.configure(MapperFeature.DEFAULT_VIEW_INCLUSION, true);
            mapper.setPropertyNamingStrategy(PropertyNamingStrategy.SNAKE_CASE);

            return mapper;
        }
    }
}
