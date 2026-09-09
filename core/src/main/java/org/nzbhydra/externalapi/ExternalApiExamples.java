package org.nzbhydra.externalapi;

/**
 * The example bodies the swagger UI shows for the external API. They are compile time constants so that they can be
 * used in {@code @ExampleObject} annotations.
 *
 * <p>Every value in here is made up: the indexers are called "Example Indexer" and "Sample Indexer", the releases
 * and identifiers do not exist, the users are alice and bob and the IPs come from the documentation ranges
 * (RFC 5737). Nothing here is taken from a real instance.
 */
public final class ExternalApiExamples {

    private ExternalApiExamples() {
    }

    public static final String PING = """
            {
              "version": "9.0.0",
              "serverTime": "2026-09-09T10:00:00Z"
            }""";

    public static final String STATS = """
            {
              "after": "2026-08-10T10:00:00Z",
              "before": "2026-09-09T10:00:00Z",
              "includeDisabled": false,
              "numberOfConfiguredIndexers": 2,
              "numberOfEnabledIndexers": 2,
              "indexerApiAccessStats": [
                {"indexerName": "Example Indexer", "percentSuccessful": 98.5, "percentConnectionError": 1.5, "averageAccessesPerDay": 42.0},
                {"indexerName": "Sample Indexer", "percentSuccessful": 91.0, "percentConnectionError": 9.0, "averageAccessesPerDay": 17.0}
              ],
              "indexerScores": [
                {"indexerName": "Example Indexer", "averageUniquenessScore": 62, "involvedSearches": 120, "uniqueDownloads": 8, "providedDownloads": 34, "coveragePercent": 71, "exclusivePercent": 23, "sharedContribution": 12.5, "sharedContributionPercent": 25, "legacyObservations": 40, "correctedObservations": 80},
                {"indexerName": "Sample Indexer", "averageUniquenessScore": 38, "involvedSearches": 120, "uniqueDownloads": 2, "providedDownloads": 16, "coveragePercent": 33, "exclusivePercent": 12, "sharedContribution": 6.5, "sharedContributionPercent": 13, "legacyObservations": 20, "correctedObservations": 40}
              ],
              "avgResponseTimes": [
                {"indexer": "Example Indexer", "avgResponseTime": 812.5, "delta": -137.5},
                {"indexer": "Sample Indexer", "avgResponseTime": 1087.5, "delta": 137.5}
              ],
              "indexerDownloadShares": [
                {"indexerName": "Example Indexer", "total": 34, "share": 68.0},
                {"indexerName": "Sample Indexer", "total": 16, "share": 32.0}
              ],
              "downloadsPerDayOfWeek": [
                {"day": "Mon", "count": 17},
                {"day": "Tue", "count": 33}
              ],
              "downloadsPerHourOfDay": [
                {"hour": 20, "count": 41},
                {"hour": 21, "count": 9}
              ],
              "searchesPerDayOfWeek": [
                {"day": "Mon", "count": 54},
                {"day": "Tue", "count": 66}
              ],
              "searchesPerHourOfDay": [
                {"hour": 20, "count": 71},
                {"hour": 21, "count": 49}
              ],
              "successfulDownloadsPerIndexer": [
                {"indexerName": "Example Indexer", "countAll": 34, "countSuccessful": 33, "countError": 1, "percentSuccessful": 97.1},
                {"indexerName": "Sample Indexer", "countAll": 16, "countSuccessful": 14, "countError": 2, "percentSuccessful": 87.5}
              ],
              "downloadSharesPerUser": [
                {"key": "alice", "count": 34, "percentage": 68.0},
                {"key": "bob", "count": 16, "percentage": 32.0}
              ],
              "downloadSharesPerIp": [
                {"key": "192.0.2.10", "count": 34, "percentage": 68.0},
                {"key": "198.51.100.7", "count": 16, "percentage": 32.0}
              ],
              "searchSharesPerUser": [
                {"key": "alice", "count": 80, "percentage": 66.7},
                {"key": "bob", "count": 40, "percentage": 33.3}
              ],
              "searchSharesPerIp": [
                {"key": "192.0.2.10", "count": 80, "percentage": 66.7},
                {"key": "198.51.100.7", "count": 40, "percentage": 33.3}
              ],
              "userAgentSearchShares": [
                {"userAgent": "Sonarr/4.0.0 (example)", "count": 80, "percentage": 66.7},
                {"userAgent": "Mozilla/5.0 (example)", "count": 40, "percentage": 33.3}
              ],
              "userAgentDownloadShares": [
                {"userAgent": "Sonarr/4.0.0 (example)", "count": 34, "percentage": 68.0},
                {"userAgent": "Mozilla/5.0 (example)", "count": 16, "percentage": 32.0}
              ],
              "downloadsPerAgeStats": {
                "percentOlder1000": 12,
                "percentOlder2000": 5,
                "percentOlder3000": 1,
                "averageAge": 420,
                "downloadsPerAge": [
                  {"age": 12, "count": 4},
                  {"age": 640, "count": 1}
                ]
              }
            }""";

    public static final String SEARCH_HISTORY = """
            {
              "page": 1,
              "limit": 100,
              "totalElements": 2,
              "totalPages": 1,
              "entries": [
                {
                  "id": 1234,
                  "time": "2026-09-09T09:58:00Z",
                  "source": "API",
                  "searchType": "TVSEARCH",
                  "category": "TV HD",
                  "query": "example show",
                  "title": null,
                  "author": null,
                  "season": 1,
                  "episode": "1",
                  "minAge": null,
                  "maxAge": null,
                  "minSize": null,
                  "maxSize": null,
                  "identifiers": [{"key": "TVDB", "value": "0000000"}],
                  "selectedIndexers": ["Example Indexer", "Sample Indexer"],
                  "username": "alice",
                  "ip": "192.0.2.10",
                  "userAgent": "Sonarr/4.0.0 (example)"
                },
                {
                  "id": 1233,
                  "time": "2026-09-09T09:40:00Z",
                  "source": "INTERNAL",
                  "searchType": "MOVIE",
                  "category": "Movies UHD",
                  "query": "sample movie",
                  "title": null,
                  "author": null,
                  "season": null,
                  "episode": null,
                  "minAge": null,
                  "maxAge": 1500,
                  "minSize": 100,
                  "maxSize": 20000,
                  "identifiers": [{"key": "IMDB", "value": "tt0000000"}],
                  "selectedIndexers": ["Example Indexer"],
                  "username": "bob",
                  "ip": "198.51.100.7",
                  "userAgent": "Mozilla/5.0 (example)"
                }
              ]
            }""";

    public static final String DOWNLOAD_HISTORY = """
            {
              "page": 1,
              "limit": 100,
              "totalElements": 2,
              "totalPages": 1,
              "entries": [
                {
                  "id": 4321,
                  "time": "2026-09-09T09:59:00Z",
                  "title": "Example.Show.S01E01.1080p.WEB-DL-EXMPL",
                  "indexer": "Example Indexer",
                  "category": null,
                  "sizeBytes": null,
                  "ageDays": 12,
                  "accessType": "REDIRECT",
                  "accessSource": "API",
                  "status": "NZB_ADDED",
                  "error": null,
                  "externalId": "SABnzbd_nzo_example",
                  "username": "alice",
                  "ip": "192.0.2.10",
                  "userAgent": "Sonarr/4.0.0 (example)"
                },
                {
                  "id": 4320,
                  "time": "2026-09-09T09:44:00Z",
                  "title": "Sample.Movie.2021.2160p.BluRay-EXMPL",
                  "indexer": "Sample Indexer",
                  "category": null,
                  "sizeBytes": null,
                  "ageDays": 640,
                  "accessType": "PROXY",
                  "accessSource": "INTERNAL",
                  "status": "CONTENT_DOWNLOAD_SUCCESSFUL",
                  "error": null,
                  "externalId": null,
                  "username": "bob",
                  "ip": "198.51.100.7",
                  "userAgent": "Mozilla/5.0 (example)"
                }
              ]
            }""";

    public static final String NOTIFICATION_HISTORY = """
            {
              "page": 1,
              "limit": 100,
              "totalElements": 2,
              "totalPages": 1,
              "entries": [
                {
                  "id": 77,
                  "time": "2026-09-09T09:59:01Z",
                  "eventType": "RESULT_DOWNLOAD",
                  "messageType": "INFO",
                  "title": "Result downloaded",
                  "body": "Example.Show.S01E01.1080p.WEB-DL-EXMPL was downloaded from Example Indexer",
                  "urls": ["json://notify.example/hooks/example"],
                  "displayed": true
                },
                {
                  "id": 76,
                  "time": "2026-09-09T08:12:00Z",
                  "eventType": "INDEXER_DISABLED",
                  "messageType": "WARNING",
                  "title": "Indexer disabled",
                  "body": "Sample Indexer was disabled until 2026-09-09T09:12:00Z",
                  "urls": [],
                  "displayed": false
                }
              ]
            }""";

    public static final String CURRENT_LOG_FILE = """
            2026-09-09 10:00:00.123 INFO  --- [nio-5076-exec-1] o.n.searching.Searcher : Searching for "example show" in 2 indexers
            2026-09-09 10:00:01.456 INFO  --- [nio-5076-exec-1] o.n.indexers.Newznab : Example Indexer returned 25 results in 812ms
            """;

    public static final String BACKUP_ENTRY = """
            {
              "filename": "nzbhydra-2026-09-09-10-00-00.zip",
              "createdAt": "2026-09-09T10:00:00Z",
              "sizeBytes": 1048576
            }""";

    public static final String BACKUP_LIST = """
            {
              "backups": [
                {"filename": "nzbhydra-2026-09-09-10-00-00.zip", "createdAt": "2026-09-09T10:00:00Z", "sizeBytes": 1048576},
                {"filename": "nzbhydra-2026-09-08-10-00-00.zip", "createdAt": "2026-09-08T10:00:00Z", "sizeBytes": 1042432}
              ]
            }""";

    public static final String ERROR_INVALID_PARAMETER = """
            {
              "status": 400,
              "code": "INVALID_PARAMETER",
              "message": "limit must be between 1 and 500 but was 501",
              "timestamp": "2026-09-09T10:00:00Z"
            }""";

    public static final String ERROR_NOT_FOUND = """
            {
              "status": 404,
              "code": "NOT_FOUND",
              "message": "No backup named nzbhydra-2026-01-01-00-00-00.zip",
              "timestamp": "2026-09-09T10:00:00Z"
            }""";

    public static final String ERROR_STATS_TIMEOUT = """
            {
              "status": 503,
              "code": "STATS_TIMEOUT",
              "message": "The stats calculation took too long and was aborted",
              "timestamp": "2026-09-09T10:00:00Z"
            }""";

    public static final String ERROR_INTERNAL = """
            {
              "status": 500,
              "code": "INTERNAL_ERROR",
              "message": "Internal error, see the log",
              "timestamp": "2026-09-09T10:00:00Z"
            }""";

    public static final String BACKUP_DOWNLOAD_REQUEST = """
            GET /externalapi/v1/backups/nzbhydra-2026-09-09-10-00-00.zip HTTP/1.1
            Host: 127.0.0.1:5076
            X-Api-Key: your-api-key
            Accept: application/zip
            """;
}
