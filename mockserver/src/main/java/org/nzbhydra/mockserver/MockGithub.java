package org.nzbhydra.mockserver;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.nzbhydra.mapping.github.Asset;
import org.nzbhydra.mapping.github.Release;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@RestController
public class MockGithub {

    private Release releasev2;
    private List<Release> releases;

    public MockGithub() {
        releasev2 = new Release();
        releasev2.setBody("Changes in version 2.0.0");
        releasev2.setTagName("v2.0.0");
        Asset windowsAsset = new Asset();
        windowsAsset.setBrowserDownloadUrl("http://192.168.1.111:5080/static/NzbHydra-v2.0.0-windows.zip");
        windowsAsset.setName("NzbHydra-v2.0.0-windows.zip");
        windowsAsset.setSize(163L);
        Asset linuxAsset = new Asset();
        linuxAsset.setBrowserDownloadUrl("http://192.168.1.111:5080/static/nzbhyra2-2.0.0-SNAPSHOT-linux.zip");
        linuxAsset.setName("nzbhyra2-2.0.0-SNAPSHOT-linux.zip");
        linuxAsset.setSize(163L);
        releasev2.setAssets(Arrays.asList(windowsAsset, linuxAsset));

        Release releasev1current = new Release();
        releasev1current.setBody("Changes in version 10.0");
        releasev1current.setTagName("v1.0.0");

        releases = Arrays.asList(releasev1current, releasev2);
    }


    @RequestMapping(value = "/repos/theotherp/nzbhydra2/releases/latest", method = RequestMethod.GET)
    public Release latestRelease() throws Exception {
        return releasev2;
    }

    @RequestMapping(value = "/repos/theotherp/nzbhydra2/releases", method = RequestMethod.GET)
    public List<Release> releases() throws Exception {
        return releases;
    }

    @RequestMapping(value = "/changelog.md", method = RequestMethod.GET, produces = org.springframework.http.MediaType.TEXT_HTML_VALUE)
    public String changelog() throws Exception {
        return "changelog";
    }

    @RequestMapping(value = "/theotherp/nzbhydra/master/news.md", method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
    public String news() throws Exception {
        return Resources.toString(Resources.getResource(MockGithub.class, "/static/news.md"), Charsets.UTF_8);
    }

    @RequestMapping(value = "/theotherp/nzbhydra/master/blockedVersions.json", method = RequestMethod.GET)
    public String blockedVersions() throws Exception {
        return "[{\"version\":{\"major\":3,\"minor\":0,\"patch\":0,\"asString\":\"3.0.0\"},\"comment\":\"some comment\"}]";
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
