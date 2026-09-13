package org.nzbhydra;

import org.junit.jupiter.api.Test;
import org.nzbhydra.externalapi.v1.ExternalApiError;
import org.nzbhydra.externalapi.v1.ExternalBackupEntry;
import org.nzbhydra.externalapi.v1.ExternalBackupListResponse;
import org.nzbhydra.externalapi.v1.ExternalDownloadHistoryEntry;
import org.nzbhydra.externalapi.v1.ExternalNotificationHistoryEntry;
import org.nzbhydra.externalapi.v1.ExternalPage;
import org.nzbhydra.externalapi.v1.ExternalPingResponse;
import org.nzbhydra.externalapi.v1.ExternalSearchHistoryEntry;
import org.nzbhydra.externalapi.v1.ExternalStatsResponse;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import tools.jackson.core.type.TypeReference;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The external API v1 (see {@code docs/external-api-design.md}) seen from the outside: an HTTP client that has the
 * configured API key and nothing else - no session, no cookie, no CSRF token. That is the whole reason the surface
 * exists, so every request here is made exactly that way.
 */
@SystemTest
public class ExternalApiV1SystemTest {

    private static final String BASE = "/externalapi/v1";
    private static final String API_KEY = "apikey";
    private static final Map<String, String> KEY_HEADER = Map.of("X-Api-Key", API_KEY);

    @Autowired
    private HydraClient hydraClient;

    @Autowired
    private Searcher searcher;

    @Autowired
    private TestDownloader downloader;

    @Value("${nzbhydra.host}")
    private String nzbhydraHost;

    @Value("${nzbhydra.port}")
    private int nzbhydraPort;

    @Test
    public void pingWithTheKeyInTheHeaderAnswersTheRunningVersion() {
        final HydraResponse response = hydraClient.get(BASE + "/ping", KEY_HEADER);

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.header("Content-Type")).startsWith("application/json");
        final ExternalPingResponse ping = response.as(ExternalPingResponse.class);
        assertThat(ping.getVersion()).isNotBlank();
        assertThat(ping.getServerTime()).isNotNull();
    }

    @Test
    public void pingWithTheKeyAsAQueryParameterIsAcceptedToo() {
        final HydraResponse response = hydraClient.get(BASE + "/ping", "apikey=" + API_KEY);

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.as(ExternalPingResponse.class).getVersion()).isNotBlank();
    }

    @Test
    public void pingWithoutAnyKeyIsAnsweredWithAnEmptyNotFound() {
        final HydraResponse response = hydraClient.get(BASE + "/ping").dontRaiseIfUnsuccessful();

        assertNotFoundAndTellsNothing(response);
    }

    @Test
    public void pingWithAWrongKeyIsAnsweredWithAnEmptyNotFound() {
        final HydraResponse response = hydraClient.get(BASE + "/ping", Map.of("X-Api-Key", "notTheApiKey"))
                .dontRaiseIfUnsuccessful();

        assertNotFoundAndTellsNothing(response);
    }

    @Test
    public void aPercentEncodedPathPrefixDoesNotGetPastTheKeyCheck() {
        //Built as an absolute URL so that the escape survives to the wire instead of being encoded a second time
        final String url = "http://" + nzbhydraHost + ":" + nzbhydraPort + "/%65xternalapi/v1/ping";

        final HydraResponse response = hydraClient.get(url).dontRaiseIfUnsuccessful();

        assertNotFoundAndTellsNothing(response);
    }

    @Test
    public void anUnknownPathUnderTheApiIsNotFoundEvenWithAValidKey() {
        final HydraResponse response = hydraClient.get(BASE + "/nothing", KEY_HEADER).dontRaiseIfUnsuccessful();

        //The body may or may not be empty; that an unknown path and a wrong key both answer 404 is the point
        assertThat(response.status()).isEqualTo(404);
    }

    @Test
    public void postingWithoutAKeyIsAnsweredWithAnEmptyNotFound() {
        final HydraResponse response = hydraClient.post(BASE + "/backups", null).dontRaiseIfUnsuccessful();

        assertNotFoundAndTellsNothing(response);
    }

    @Test
    public void statsReportTheIndexerApiAccessesOfASearchAndADownload() throws Exception {
        searcher.searchExternalApi("externalapistats" + random());
        downloader.searchSomethingAndTriggerDownload("externalapistatsdownload" + random());
        Thread.sleep(1000);

        final ExternalStatsResponse stats = hydraClient.get(BASE + "/stats", KEY_HEADER).as(ExternalStatsResponse.class);

        assertThat(stats.getAfter()).isNotNull();
        assertThat(stats.getBefore()).isNotNull();
        assertThat(stats.getIndexerApiAccessStats()).isNotEmpty();
    }

    @Test
    public void theSectionParameterLimitsWhatIsCalculated() throws Exception {
        searcher.searchExternalApi("externalapisection" + random());
        Thread.sleep(1000);

        final ExternalStatsResponse stats = hydraClient.get(BASE + "/stats", KEY_HEADER, "section=INDEXER_API_ACCESS")
                .as(ExternalStatsResponse.class);

        assertThat(stats.getIndexerApiAccessStats()).isNotEmpty();
        assertThat(stats.getAvgResponseTimes()).isNull();
        assertThat(stats.getIndexerScores()).isNull();
        assertThat(stats.getDownloadsPerDayOfWeek()).isNull();
    }

    @Test
    public void statsWithABeforeThatIsNotAfterTheAfterAreRejected() {
        final Instant after = Instant.now();

        final HydraResponse response = hydraClient.get(BASE + "/stats", KEY_HEADER,
                "after=" + after, "before=" + after.minusSeconds(60)).dontRaiseIfUnsuccessful();

        assertThat(response.status()).isEqualTo(400);
        assertThat(response.as(ExternalApiError.class).getCode()).isEqualTo("INVALID_PARAMETER");
    }

    @Test
    public void theSearchHistoryContainsTheQueryThatWasJustSearched() throws Exception {
        final String query = "externalapisearchhistory" + random();
        searcher.searchExternalApi(query);
        Thread.sleep(1000);

        final ExternalPage<ExternalSearchHistoryEntry> page = searchHistory("query=" + query);

        assertThat(page.getPage()).isEqualTo(1);
        assertThat(page.getEntries()).isNotEmpty();
        assertThat(page.getEntries()).extracting(ExternalSearchHistoryEntry::getQuery).contains(query);
        assertThat(page.getEntries().get(0).getTime()).isNotNull();
    }

    @Test
    public void aLimitAboveFiveHundredIsRejected() {
        final HydraResponse response = hydraClient.get(BASE + "/history/searches", KEY_HEADER, "limit=501")
                .dontRaiseIfUnsuccessful();

        assertThat(response.status()).isEqualTo(400);
        assertThat(response.as(ExternalApiError.class).getCode()).isEqualTo("INVALID_PARAMETER");
    }

    @Test
    public void ascendingAndDescendingOrderReverseTheSearchHistory() throws Exception {
        final String prefix = "externalapiorder" + random();
        searcher.searchExternalApi(prefix + "first");
        //The entries are ordered by their time alone, so they must not fall into the same instant
        Thread.sleep(1500);
        searcher.searchExternalApi(prefix + "second");
        Thread.sleep(1000);

        final ExternalPage<ExternalSearchHistoryEntry> descending = searchHistory("query=" + prefix, "order=desc");
        final ExternalPage<ExternalSearchHistoryEntry> ascending = searchHistory("query=" + prefix, "order=asc");

        assertThat(descending.getEntries()).hasSizeGreaterThanOrEqualTo(2);
        assertThat(ascending.getEntries()).hasSameSizeAs(descending.getEntries());
        assertThat(descending.getEntries().get(0).getQuery()).isEqualTo(prefix + "second");
        assertThat(ascending.getEntries().get(0).getQuery()).isEqualTo(prefix + "first");
    }

    @Test
    public void aToBeforeTheSearchExcludesItFromTheHistory() throws Exception {
        final Instant beforeTheSearch = Instant.now().minusSeconds(60);
        final String query = "externalapito" + random();
        searcher.searchExternalApi(query);
        Thread.sleep(1000);

        assertThat(searchHistory("query=" + query).getEntries()).isNotEmpty();
        assertThat(searchHistory("query=" + query, "to=" + beforeTheSearch).getEntries()).isEmpty();
    }

    @Test
    public void theDownloadHistoryContainsTheTitleThatWasJustDownloaded() throws Exception {
        final NewznabXmlItem downloaded = downloader.searchSomethingAndTriggerDownload("externalapidownload" + random());
        Thread.sleep(1000);

        final ExternalPage<ExternalDownloadHistoryEntry> page = hydraClient
                .get(BASE + "/history/downloads", KEY_HEADER, "title=" + downloaded.getTitle())
                .as(new TypeReference<>() {
                });

        assertThat(page.getPage()).isEqualTo(1);
        assertThat(page.getEntries()).isNotEmpty();
        assertThat(page.getEntries()).extracting(ExternalDownloadHistoryEntry::getTitle).contains(downloaded.getTitle());
        assertThat(page.getEntries().get(0).getIndexer()).isNotBlank();
    }

    @Test
    public void theNotificationHistoryAnswersAPagedEnvelope() {
        final ExternalPage<ExternalNotificationHistoryEntry> page = hydraClient
                .get(BASE + "/history/notifications", KEY_HEADER)
                .as(new TypeReference<>() {
                });

        assertThat(page.getPage()).isEqualTo(1);
        assertThat(page.getLimit()).isGreaterThan(0);
        assertThat(page.getEntries()).isNotNull();
        assertThat(page.getTotalElements()).isGreaterThanOrEqualTo(page.getEntries().size());
    }

    @Test
    public void theCurrentLogFileIsPlainTextAndContainsALineTheTestJustCaused() throws Exception {
        final String marker = "externalapilogmarker" + random();
        //ExternalApi logs every call it receives with its parameters, the query among them
        searcher.searchExternalApi(marker);
        Thread.sleep(1000);

        final HydraResponse response = hydraClient.get(BASE + "/log/current", KEY_HEADER);

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.header("Content-Type")).startsWith("text/plain");
        assertThat(response.body()).isNotEmpty();
        assertThat(response.body()).contains(marker);
    }

    @Test
    public void aBackupIsCreatedListedAndDownloadableWithTheKeyAlone() {
        final HydraResponse createResponse = hydraClient
                .call("POST", BASE + "/backups", KEY_HEADER, null)
                .dontRaiseIfUnsuccessful();

        //No cookie and no X-XSRF-TOKEN were sent: the surface is CSRF exempt on purpose
        assertThat(createResponse.status()).isEqualTo(201);
        final ExternalBackupEntry created = createResponse.as(ExternalBackupEntry.class);
        assertThat(created.getFilename()).endsWith(".zip");
        assertThat(created.getCreatedAt()).isNotNull();
        assertThat(created.getSizeBytes()).isGreaterThan(0);

        final ExternalBackupListResponse list = hydraClient.get(BASE + "/backups", KEY_HEADER)
                .as(ExternalBackupListResponse.class);
        assertThat(list.getBackups()).extracting(ExternalBackupEntry::getFilename).contains(created.getFilename());

        final HydraResponse downloadResponse = hydraClient.get(BASE + "/backups/" + created.getFilename(), KEY_HEADER);
        assertThat(downloadResponse.status()).isEqualTo(200);
        assertThat(downloadResponse.body()).startsWith("PK");
        assertThat(downloadResponse.header("Content-Disposition")).contains(created.getFilename());
    }

    @Test
    public void downloadingABackupThatDoesNotExistIsAStructuredNotFound() {
        final HydraResponse response = hydraClient.get(BASE + "/backups/does-not-exist.zip", KEY_HEADER)
                .dontRaiseIfUnsuccessful();

        assertThat(response.status()).isEqualTo(404);
        final ExternalApiError error = response.as(ExternalApiError.class);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
        assertThat(error.getStatus()).isEqualTo(404);
    }

    @Test
    public void aBackupFilenameCannotEscapeTheBackupFolder() {
        //Built as an absolute URL so that the encoded slash survives to the wire instead of being normalised away
        final String url = "http://" + nzbhydraHost + ":" + nzbhydraPort + BASE + "/backups/..%2Fnzbhydra.yml";

        final HydraResponse response = hydraClient.get(url, KEY_HEADER).dontRaiseIfUnsuccessful();

        assertThat(response.status()).isNotEqualTo(200);
        assertThat(response.body()).doesNotStartWith("PK");
    }

    /**
     * The whole point of the key check's answer: it must be indistinguishable from an unknown path. A body, a
     * {@code Set-Cookie}, a {@code WWW-Authenticate} or a redirect would each tell an unauthenticated caller that the
     * surface is there and what it wants (see the review checklist in {@code docs/external-api-design.md}).
     */
    private void assertNotFoundAndTellsNothing(HydraResponse response) {
        assertThat(response.status()).isEqualTo(404);
        assertThat(response.body()).isEmpty();
        assertThat(response.header("Set-Cookie")).as("Set-Cookie on the auth-failure 404, headers were %s",
                response.getHeaders()).isNull();
        assertThat(response.header("WWW-Authenticate")).isNull();
        assertThat(response.header("Location")).isNull();
    }

    private ExternalPage<ExternalSearchHistoryEntry> searchHistory(String... parameters) {
        return hydraClient.get(BASE + "/history/searches", KEY_HEADER, parameters).as(new TypeReference<>() {
        });
    }

    private static String random() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
