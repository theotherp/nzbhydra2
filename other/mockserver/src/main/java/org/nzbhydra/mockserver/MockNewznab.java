package org.nzbhydra.mockserver;

import jakarta.annotation.PostConstruct;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlResponse;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.mockserver.newznab.DeterministicFixtures;
import org.nzbhydra.mockserver.newznab.MockContext;
import org.nzbhydra.mockserver.newznab.Scenario;
import org.nzbhydra.mockserver.newznab.ScenarioRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

/**
 * Mock newznab and torznab indexer. The actual search behaviour lives in the two scenario registries in
 * {@link org.nzbhydra.mockserver.newznab}; this controller only maps the endpoints, answers the two protocol requests
 * that are not search behaviour (caps and getnfo) and runs the resolved scenario.
 */
@RestController
public class MockNewznab {

    //Delegating constants so that existing references keep working
    public static final String DETERMINISTIC_TORRENT_FILE_QUERY = DeterministicFixtures.DETERMINISTIC_TORRENT_FILE_QUERY;
    public static final String DETERMINISTIC_MAGNET_QUERY = DeterministicFixtures.DETERMINISTIC_MAGNET_QUERY;
    public static final String DETERMINISTIC_TORRENT_TITLE = DeterministicFixtures.DETERMINISTIC_TORRENT_TITLE;
    public static final String DETERMINISTIC_MAGNET_TITLE = DeterministicFixtures.DETERMINISTIC_MAGNET_TITLE;
    public static final String DETERMINISTIC_TORRENT_CONTENT = DeterministicFixtures.DETERMINISTIC_TORRENT_CONTENT;
    public static final String DETERMINISTIC_MAGNET_URI = DeterministicFixtures.DETERMINISTIC_MAGNET_URI;
    public static final String DETERMINISTIC_DOWNLOADER_QUERY = DeterministicFixtures.DETERMINISTIC_DOWNLOADER_QUERY;
    public static final String DETERMINISTIC_DOWNLOADER_TITLE = DeterministicFixtures.DETERMINISTIC_DOWNLOADER_TITLE;
    public static final String DETERMINISTIC_DOWNLOADER_CONTENT = DeterministicFixtures.DETERMINISTIC_DOWNLOADER_CONTENT;
    public static final String DETERMINISTIC_MOVIE_TMDB_ID = DeterministicFixtures.DETERMINISTIC_MOVIE_TMDB_ID;
    public static final String DETERMINISTIC_MOVIE_TITLE = DeterministicFixtures.DETERMINISTIC_MOVIE_TITLE;
    public static final String DETERMINISTIC_NZBGET_QUERY_PREFIX = DeterministicFixtures.DETERMINISTIC_NZBGET_QUERY_PREFIX;
    public static final String DETERMINISTIC_NZBGET_TITLE = DeterministicFixtures.DETERMINISTIC_NZBGET_TITLE;
    public static final String DETERMINISTIC_NZBGET_CONTENT = DeterministicFixtures.DETERMINISTIC_NZBGET_CONTENT;

    private static final Logger logger = LoggerFactory.getLogger(MockNewznab.class);

    private final ScenarioRegistry newznabScenarios = ScenarioRegistry.newznab();
    private final ScenarioRegistry torznabScenarios = ScenarioRegistry.torznab();

    @Value("${main.host:127.0.0.1}")
    private String host;
    @Value("${server.port:5080}")
    private int port;

    @PostConstruct
    public void init() {
        NewznabMockBuilder.host = this.host;
        NewznabMockBuilder.port = this.port;
    }

    @RequestMapping(value = "/nzb/{nzbId}", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> nzbDownload(@PathVariable("nzbId") String nzbId) throws Exception {
        if (nzbId.endsWith("91")) {
            logger.info("Returning 91 - too many requests");
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
        }
        if (nzbId.endsWith("92")) {
            logger.info("Returning 92 - not found");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        if (nzbId.endsWith("93")) {

            logger.info("Returning 429 - request limit reached");
            return ResponseEntity.status(429).body("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                "<error code=\"429\" description=\"Request limit reached\"/>");
        }

        logger.info("Returning NZB with ID {}", nzbId);
        return ResponseEntity.ok("Would download NZB with ID" + nzbId);
    }

    @RequestMapping(value = "/details/{nzbId}", produces = MediaType.APPLICATION_XML_VALUE)
    public String nzbDetails(@PathVariable("nzbId") String nzbId) throws Exception {
        return "Would show details for NZB with ID" + nzbId;
    }

    @RequestMapping(value = "/comments/{nzbId}", produces = MediaType.APPLICATION_XML_VALUE)
    public String nzbComments(@PathVariable("nzbId") String nzbId) throws Exception {
        return "Would show comments for NZB with ID" + nzbId;
    }

    @RequestMapping(value = "/torrent/deterministic-file", method = RequestMethod.GET, produces = "application/x-bittorrent")
    public byte[] deterministicTorrentFile() {
        return DETERMINISTIC_TORRENT_CONTENT.getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    @RequestMapping(value = {"/api", "/dognzb/api"}, produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<?> api(NewznabParameters params) throws Exception {
        logger.info("Received API request {}", params);
        MockContext context = MockContext.of(params, host, port);
        ScenarioRegistry.Resolution resolution = newznabScenarios.resolveWithDelays(context);

        //Caps and getnfo are answered here, but the original chain checked the 429 API key before caps and the 403
        //query before getnfo, so those two scenarios are given their chance first
        if (resolution.isResolvedTo("protocol-too-many-requests")) {
            return respond(newznabScenarios, resolution, context);
        }
        if (params.getT() == ActionAttribute.CAPS) {
            logger.info("Returning caps");
            return new ResponseEntity<>(NewznabMockBuilder.getCaps(), HttpStatus.OK);
        }
        if (resolution.isResolvedTo("protocol-forbidden")) {
            return respond(newznabScenarios, resolution, context);
        }
        if (params.getT() == ActionAttribute.GETNFO) {
            logger.info("Returning NFO for NZB with ID {}", params.getId());
            NewznabXmlRoot rssRoot = new NewznabXmlRoot();
            rssRoot.getRssChannel().setNewznabResponse(new NewznabXmlResponse(0, 1));
            NewznabXmlItem item = new NewznabXmlItem();
            item.setDescription("NFO for NZB with ID " + params.getId());
            rssRoot.getRssChannel().getItems().add(item);
            return ResponseEntity.ok(rssRoot);
        }

        return respond(newznabScenarios, resolution, context);
    }

    @RequestMapping(value = "/torznab/api", produces = {MediaType.TEXT_XML_VALUE, MediaType.APPLICATION_XML_VALUE})
    public ResponseEntity<?> torznabapi(NewznabParameters params) throws Exception {
        logger.info("Received torznab API request {}", params);
        if (params.getT() == ActionAttribute.CAPS) {
            logger.info("Returning caps");
            return new ResponseEntity<>(NewznabMockBuilder.getCaps(), HttpStatus.OK);
        }
        MockContext context = MockContext.of(params, host, port);
        return respond(torznabScenarios, torznabScenarios.resolveWithDelays(context), context);
    }

    /**
     * Lists every scenario of both registries, in the order in which they are resolved.
     */
    @RequestMapping(value = "/mock/scenarios", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<ScenarioDescription> scenarios() {
        List<ScenarioDescription> descriptions = new ArrayList<>();
        for (ScenarioRegistry registry : List.of(newznabScenarios, torznabScenarios)) {
            for (Scenario scenario : registry.all()) {
                descriptions.add(new ScenarioDescription(scenario.id(), scenario.description(), registry.endpoint()));
            }
        }
        return descriptions;
    }

    private ResponseEntity<?> respond(ScenarioRegistry registry, ScenarioRegistry.Resolution resolution, MockContext context) throws Exception {
        return resolution.respond(context, scenario -> logger.info("{} request {} scenario {}", registry.endpoint(),
                scenario.isTerminating() ? "answered by" : "delayed by", scenario.id()));
    }

    public record ScenarioDescription(String id, String description, String endpoint) {
    }

}
