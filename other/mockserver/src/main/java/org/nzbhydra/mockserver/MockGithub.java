package org.nzbhydra.mockserver;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import org.nzbhydra.mapping.changelog.ChangelogChangeEntry;
import org.nzbhydra.mapping.changelog.ChangelogVersionEntry;
import org.nzbhydra.mapping.github.Asset;
import org.nzbhydra.mapping.github.Release;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.List;

@RestController
public class MockGithub {

    private static final Logger logger = LoggerFactory.getLogger(MockGithub.class);

    private Release releasev276;
    private List<Release> releases;
    private Asset windowsAsset = new Asset();

    public MockGithub() {
        releasev276 = new Release();
        releasev276.setBody("Changes in version 2.7.6");
        releasev276.setUrl("http://127.0.0.1:5080/repos/theotherp/nzbhydra2/releases/1");
        releasev276.setTagName("v2.7.6");
        windowsAsset.setBrowserDownloadUrl("http://127.0.0.1:5080/static/nzbhyra2-2.0.0-SNAPSHOT-windows.zip");
        windowsAsset.setName("nzbhyra2-3.1.0-SNAPSHOT-windows.zip");
        windowsAsset.setSize(163L);
        Asset linuxAsset = new Asset();
        linuxAsset.setBrowserDownloadUrl("http://127.0.0.1.111:5080/static/nzbhyra2-2.0.0-SNAPSHOT-linux.zip");
        linuxAsset.setName("nzbhyra2-3.1.0-SNAPSHOT-linux.zip");
        linuxAsset.setSize(163L);
        releasev276.setAssets(Arrays.asList(windowsAsset, linuxAsset));

        Release releasev1current = new Release();
        releasev1current.setBody("Changes in version 10.0");
        releasev1current.setTagName("v10.0.0");

        releases = Arrays.asList(releasev1current, releasev276);
    }


    @RequestMapping(value = "/repos/theotherp/nzbhydra2/releases/latest", method = RequestMethod.GET)
    public Release latestRelease() throws Exception {
        return releasev276;
    }

    @RequestMapping(value = "/repos/theotherp/nzbhydra2/releases", method = RequestMethod.GET)
    public List<Release> releases() throws Exception {
        return releases;
    }

    @RequestMapping(value = "/repos/theotherp/nzbhydra2/releases", method = RequestMethod.POST)
    public Release postRelease(@RequestBody String body) throws Exception {
        releasev276.setUploadUrl("http://127.0.0.1:5080/upload");
        logger.info(body);
        return releasev276;
    }

    @RequestMapping(value = "/repos/theotherp/nzbhydra2/releases/1", method = RequestMethod.PATCH)
    public Release patchRelease(@RequestBody String body) throws Exception {
        releasev276.setDraft(false);
        logger.info(body);
        return releasev276;
    }

    @RequestMapping(value = "/upload", method = RequestMethod.POST)
    public Asset uploadAsset(@RequestBody byte[] body) throws Exception {
        logger.info("Upload of {} bytes successful", body.length);
        return windowsAsset;
    }

    @RequestMapping(value = "/changelog", method = RequestMethod.GET)
    public List<ChangelogVersionEntry> changelog() throws Exception {
        return Arrays.asList(
                new ChangelogVersionEntry("3.0.0", Arrays.asList(new ChangelogChangeEntry("note", "a note"), new ChangelogChangeEntry("note", "another note"), new ChangelogChangeEntry("note", "yet another note"))),
                new ChangelogVersionEntry("0.0.1", Arrays.asList(new ChangelogChangeEntry("fix", "a minor fix"))),
                new ChangelogVersionEntry("0.1.0", Arrays.asList(new ChangelogChangeEntry("feature", "a new feature")))
        );
    }

    @RequestMapping(value = "/theotherp/nzbhydra/master/news.json", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public String news() throws Exception {
        return new String(Files.readAllBytes(new File("news.json").toPath()));
    }

    @RequestMapping(value = "/theotherp/nzbhydra/master/blockedVersions.json", method = RequestMethod.GET)
    public String blockedVersions() throws Exception {
        return "[{\"version\":\"3.2.1\",\"comment\":\"some comment\"}]";
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
