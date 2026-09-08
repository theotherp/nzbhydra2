package org.nzbhydra.mockserver.newznab;

import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlApilimits;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

/**
 * Resolves requests against a registry and runs the resulting behaviour without ever really sleeping.
 */
final class ScenarioTestSupport {

    static final String HOST = "127.0.0.1";
    static final int PORT = 5080;

    static final ScenarioRegistry NEWZNAB = ScenarioRegistry.newznab();
    static final ScenarioRegistry TORZNAB = ScenarioRegistry.torznab();

    static {
        NewznabMockBuilder.host = HOST;
        NewznabMockBuilder.port = PORT;
    }

    private ScenarioTestSupport() {
    }

    static NewznabParameters params(String apikey, String query) {
        NewznabParameters params = new NewznabParameters();
        params.setApikey(apikey);
        params.setQ(query);
        return params;
    }

    static Answer answer(NewznabParameters params) throws Exception {
        return answer(NEWZNAB, params);
    }

    static Answer answer(String apikey, String query) throws Exception {
        return answer(NEWZNAB, params(apikey, query));
    }

    static Answer answer(ScenarioRegistry registry, NewznabParameters params) throws Exception {
        List<Duration> sleeps = new ArrayList<>();
        MockContext context = new MockContext(params, IndexerPersona.of(params), new Random(42), HOST, PORT, sleeps::add);
        ScenarioRegistry.Resolution resolution = registry.resolveWithDelays(context);
        Scenario scenario = resolution.scenario().orElseThrow(() -> new AssertionError("No scenario matched " + params));
        return new Answer(scenario.id(), resolution.respond(context, ignored -> {
        }), sleeps);
    }

    record Answer(String scenarioId, ResponseEntity<?> response, List<Duration> sleeps) {

        HttpStatusCode status() {
            return response.getStatusCode();
        }

        Object body() {
            return response.getBody();
        }

        NewznabXmlRoot root() {
            return (NewznabXmlRoot) response.getBody();
        }

        List<NewznabXmlItem> items() {
            List<NewznabXmlItem> items = root().getRssChannel().getItems();
            return items == null ? Collections.emptyList() : items;
        }

        Integer total() {
            return root().getRssChannel().getNewznabResponse().getTotal();
        }

        NewznabXmlApilimits apiLimits() {
            return root().getRssChannel().getApiLimits();
        }

    }

}
