

package org.nzbhydra.externaltools;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.webaccess.WebAccess;
import org.nzbhydra.webaccess.WebAccessException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.endsWith;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class ExternalToolsTest {

    @Test
    void bla() throws Exception {
        String json = """
                {
                  "enableRss" : true,
                  "enableAutomaticSearch" : true,
                  "enableInteractiveSearch" : true,
                  "supportsRss" : true,
                  "supportsSearch" : true,
                  "protocol" : "torrent",
                  "name" : "NZBHydra2 (mocktorz1)",
                  "fields" : [ {
                    "name" : "apiKey",
                    "value" : "apikey"
                  }, {
                    "name" : "categories",
                    "value" : [ "2000" ]
                  }, {
                    "name" : "additionalParameters",
                    "value" : "&indexers=mocktorz1"
                  }, {
                    "name" : "seedCriteria.seedRatio"
                  }, {
                    "name" : "seedCriteria.seedTime"
                  }, {
                    "name" : "baseUrl",
                    "value" : "http://host.docker.internal:5076/torznab"
                  }, {
                    "name" : "minimumSeeders",
                    "value" : 1
                  }, {
                    "name" : "removeYear",
                    "value" : false
                  }, {
                    "name" : "multiLanguages",
                    "value" : [ ]
                  }, {
                    "name" : "apiPath",
                    "value" : "/api"
                  } ],
                  "implementationName" : "Torznab",
                  "implementation" : "Torznab",
                  "configContract" : "TorznabSettings",
                  "infoLink" : "https://github.com/Sonarr/Sonarr/wiki/Supported-Indexers#newznab",
                  "tags" : [ ],
                  "id" : 0,
                  "priority" : 50
                }\
                """;

        final ExternalTools.XdarrIndexer xdarrIndexer = Jackson.JSON_MAPPER.readValue(json, ExternalTools.XdarrIndexer.class);
        xdarrIndexer.getFields().sort(Comparator.comparing(ExternalTools.XdarrAddRequestField::getName));
        System.out.println(Jackson.JSON_MAPPER.writeValueAsString(xdarrIndexer));

    }

    /**
     * FM-070. `minimumSeeders` and `categories` are the two free-text fields
     * NZBHydra itself parses as numbers before writing them into the *arr
     * instance, and both are driven here through the public entry point rather
     * than through the private helpers that parse them: the helpers are only
     * ever reached from {@link ExternalTools#addNzbhydraAsIndexer(AddRequest)},
     * which catches every exception and answers {@code false}, so a guard that
     * works in isolation but is bypassed by the caller would still look fine.
     * For the same reason every assertion here is on the body that was posted
     * (or on the fact that nothing was posted at all) and on
     * {@link ExternalTools#getMessages()}, never on the boolean alone.
     */
    @Nested
    @MockitoSettings(strictness = Strictness.LENIENT)
    class NumericInputGuards {

        @Mock
        private WebAccess webAccessMock;
        @Mock
        private ConfigProvider configProviderMock;

        @InjectMocks
        private ExternalTools testee = new ExternalTools();

        private final BaseConfig baseConfig = new BaseConfig();
        private final List<String> postedBodies = new ArrayList<>();

        @BeforeEach
        void setUp() throws Exception {
            baseConfig.getMain().setApiKey("hydra-api-key");
            when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
            //The version probe and the "which NZBHydra entries exist already" probe are the only two GETs this path makes.
            when(webAccessMock.callUrl(endsWith("/system/status"), anyMap())).thenReturn("{\"version\": \"4.0.0\"}");
            when(webAccessMock.callUrl(endsWith("/api/v3/indexer"), anyMap())).thenReturn("[]");
            when(webAccessMock.postToUrl(anyString(), any(), anyString(), anyMap(), anyInt())).thenAnswer(invocation -> {
                postedBodies.add(invocation.getArgument(2));
                return "{}";
            });
        }

        @Test
        void shouldSendTheDocumentedDefaultForAnAbsentMinimumSeeders() throws Exception {
            assertThat(configureWithMinimumSeeders(null)).isTrue();

            assertThat(postedFieldValue("minimumSeeders")).isEqualTo(1);
        }

        @Test
        void shouldSendTheDocumentedDefaultForAnEmptyMinimumSeeders() throws Exception {
            assertThat(configureWithMinimumSeeders("")).isTrue();

            assertThat(postedFieldValue("minimumSeeders")).isEqualTo(1);
        }

        @Test
        void shouldSendTheDocumentedDefaultForABlankMinimumSeeders() throws Exception {
            assertThat(configureWithMinimumSeeders("   ")).isTrue();

            assertThat(postedFieldValue("minimumSeeders")).isEqualTo(1);
        }

        @Test
        void shouldSendASuppliedMinimumSeeders() throws Exception {
            assertThat(configureWithMinimumSeeders("5")).isTrue();

            assertThat(postedFieldValue("minimumSeeders")).isEqualTo(5);
        }

        @Test
        void shouldRefuseANonNumericMinimumSeedersByName() throws Exception {
            assertThat(configureWithMinimumSeeders("abc")).isFalse();

            assertThat(testee.getMessages()).contains("Error: Minimum seeders must be a whole number but was \"abc\"");
            assertThat(testee.getMessages()).noneMatch(x -> x.contains("For input string"));
            assertThat(postedBodies).isEmpty();
            verify(webAccessMock, never()).postToUrl(anyString(), any(), anyString(), anyMap(), anyInt());
        }

        @Test
        void shouldTolerateSpacingAndTrailingSeparatorsInCategories() throws Exception {
            assertThat(configureWithCategories("5030, 5040")).isTrue();
            assertThat(postedFieldValue("categories")).isEqualTo(List.of(5030, 5040));

            postedBodies.clear();
            assertThat(configureWithCategories("5030,5040,")).isTrue();
            assertThat(postedFieldValue("categories")).isEqualTo(List.of(5030, 5040));
        }

        @Test
        void shouldSendAnEmptyCategoryListForAnAbsentOrEmptyValue() throws Exception {
            assertThat(configureWithCategories(null)).isTrue();
            assertThat(postedFieldValue("categories")).isEqualTo(List.of());

            postedBodies.clear();
            assertThat(configureWithCategories("")).isTrue();
            assertThat(postedFieldValue("categories")).isEqualTo(List.of());
        }

        @Test
        void shouldRefuseANonNumericCategoryByName() throws Exception {
            assertThat(configureWithCategories("5030,abc")).isFalse();

            assertThat(testee.getMessages()).contains("Error: Categories must be comma-separated whole numbers but \"5030,abc\" contains \"abc\"");
            assertThat(testee.getMessages()).noneMatch(x -> x.contains("For input string"));
            assertThat(postedBodies).isEmpty();
            verify(webAccessMock, never()).postToUrl(anyString(), any(), anyString(), anyMap(), anyInt());
        }

        private boolean configureWithMinimumSeeders(String minimumSeeders) throws Exception {
            final AddRequest addRequest = torrentAddRequest();
            addRequest.setMinimumSeeders(minimumSeeders);
            return testee.addNzbhydraAsIndexer(addRequest);
        }

        private boolean configureWithCategories(String categories) throws Exception {
            final AddRequest addRequest = torrentAddRequest();
            addRequest.setCategories(categories);
            return testee.addNzbhydraAsIndexer(addRequest);
        }

        /**
         * A single torznab entry: the only branch that reads
         * {@code minimumSeeders}, and the one an add type of
         * {@code SINGLE} reaches without needing a configured torznab indexer.
         */
        private AddRequest torrentAddRequest() {
            final AddRequest addRequest = new AddRequest();
            addRequest.setExternalTool(AddRequest.ExternalTool.Sonarr);
            addRequest.setAddType(AddRequest.AddType.SINGLE);
            addRequest.setConfigureForUsenet(false);
            addRequest.setConfigureForTorrents(true);
            addRequest.setXdarrHost("http://sonarr:8989");
            addRequest.setXdarrApiKey("sonarr-api-key");
            addRequest.setNzbhydraName("NZBHydra2");
            addRequest.setNzbhydraHost("http://hydra:5076");
            return addRequest;
        }

        private Object postedFieldValue(String fieldName) {
            assertThat(postedBodies).hasSize(1);
            final ExternalTools.XdarrIndexer posted = Jackson.JSON_MAPPER.readValue(postedBodies.get(0), ExternalTools.XdarrIndexer.class);
            return posted.getFields().stream()
                    .filter(x -> fieldName.equals(x.getName()))
                    .map(ExternalTools.XdarrAddRequestField::getValue)
                    .findFirst()
                    .orElseThrow(() -> new AssertionError("No field \"" + fieldName + "\" in posted body: " + postedBodies.get(0)));
        }
    }

    /**
     * FM-071 / ADR-0019's addendum. {@code handleXdarrError}'s final {@code else} branch is the one that runs when the
     * external tool answers with something other than a JSON array or object -- an HTML error page, for instance -- and
     * the entry it adds to {@link ExternalTools#getMessages()} is returned to the user by
     * {@code POST /internalapi/externalTools/syncAll} and {@code GET /internalapi/externalTools/messages}. It must
     * therefore carry the response message and code but not the body.
     */
    @Nested
    @MockitoSettings(strictness = Strictness.LENIENT)
    class BoundedXdarrErrorMessage {

        /** Starts with neither "[" nor "{", so the two parsing branches are skipped and the fallback branch runs. */
        private static final String HTML_ERROR_PAGE = """
                <html><body><h1>500 Internal Server Error</h1><pre>at org.example.Whatever.explode(Whatever.java:42)
                at org.example.Whatever.alsoExplode(Whatever.java:43)</pre></body></html>""";

        @Mock
        private WebAccess webAccessMock;
        @Mock
        private ConfigProvider configProviderMock;

        @InjectMocks
        private ExternalTools testee = new ExternalTools();

        private final BaseConfig baseConfig = new BaseConfig();

        @BeforeEach
        void setUp() throws Exception {
            baseConfig.getMain().setApiKey("hydra-api-key");
            when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
            when(webAccessMock.callUrl(endsWith("/system/status"), anyMap())).thenReturn("{\"version\": \"4.0.0\"}");
            //One existing NZBHydra entry, so the delete below is actually reached.
            when(webAccessMock.callUrl(endsWith("/api/v3/indexer"), anyMap())).thenReturn("[{\"id\": 7, \"name\": \"NZBHydra2 (mock)\", \"fields\": []}]");
            when(webAccessMock.deleteToUrl(anyString(), anyMap(), anyInt()))
                    .thenThrow(new WebAccessException("Internal Server Error", HTML_ERROR_PAGE, 500));
        }

        @Test
        void shouldReportAnUnparseableToolErrorWithoutItsResponseBody() throws Exception {
            assertThat(testee.addNzbhydraAsIndexer(deleteOnlyRequest())).isFalse();

            final String fromHandleXdarrError = testee.getMessages().get(0);
            assertThat(fromHandleXdarrError).isEqualTo("Internal Server Error. Code: 500");
            assertThat(fromHandleXdarrError).doesNotContain("<html>", "Whatever.java", "\n");
        }

        /**
         * The branch rethrows, and {@code addNzbhydraAsIndexer}'s blanket {@code catch} then adds its own
         * {@code "Unexpected error: " + e.getMessage()} entry, which still carries the full body. That call site is
         * outside FM-071's write scope (ADR-0019's addendum names {@code handleXdarrError}'s fallback branch only, and
         * the ADR requires its own escalation for a leak found through another path), so the residual leak is pinned
         * here rather than fixed: whoever bounds it should turn these assertions around instead of deleting them.
         */
        @Test
        void shouldStillLeakTheBodyThroughTheBlanketCatchWhichIsOutOfScopeHere() throws Exception {
            assertThat(testee.addNzbhydraAsIndexer(deleteOnlyRequest())).isFalse();

            final String fromBlanketCatch = testee.getMessages().get(testee.getMessages().size() - 1);
            assertThat(fromBlanketCatch).startsWith("Unexpected error: Internal Server Error. <html>");
            assertThat(fromBlanketCatch).endsWith("Code: 500");
        }

        private AddRequest deleteOnlyRequest() {
            final AddRequest addRequest = new AddRequest();
            addRequest.setExternalTool(AddRequest.ExternalTool.Sonarr);
            addRequest.setAddType(AddRequest.AddType.DELETE_ONLY);
            addRequest.setXdarrHost("http://sonarr:8989");
            addRequest.setXdarrApiKey("sonarr-api-key");
            addRequest.setNzbhydraName("NZBHydra2");
            addRequest.setNzbhydraHost("http://hydra:5076");
            return addRequest;
        }
    }

}
