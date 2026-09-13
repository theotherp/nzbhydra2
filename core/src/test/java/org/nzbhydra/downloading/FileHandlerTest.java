package org.nzbhydra.downloading;

import okhttp3.Call;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Protocol;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerApiAccessEntityShortRepository;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.misc.TempFileProvider;
import org.nzbhydra.searching.SearchModuleProvider;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.springframework.context.ApplicationEventPublisher;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.LENIENT)
class FileHandlerTest {

    @Mock
    private TempFileProvider tempFileProvider;
    @Mock
    private ConfigProvider configProvider;
    @Mock
    private FileDownloadRepository downloadRepository;
    @Mock
    private IndexerApiAccessEntityShortRepository shortRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private SearchResultRepository searchResultRepository;
    @Mock
    private SearchModuleProvider searchModuleProvider;
    @Mock
    private HydraOkHttp3ClientHttpRequestFactory clientHttpRequestFactory;

    @InjectMocks
    private FileHandler testee;

    @TempDir
    Path tempDir;

    private final List<File> providedTempFiles = new ArrayList<>();

    @BeforeEach
    void setUp() throws IOException {
        when(tempFileProvider.getTempFile(anyString(), anyString()))
                .thenAnswer(inv -> {
                    final File file = File.createTempFile("nzbhydra-test", inv.getArgument(1));
                    providedTempFiles.add(file);
                    return file;
                });
        when(configProvider.getBaseConfig()).thenReturn(new BaseConfig());
    }

    @Test
    void shouldReturnErrorResultForNonStandardHttpStatusCode() throws Exception {
        SearchResultEntity searchResult = new SearchResultEntity(new IndexerEntity("indexerName"), Instant.now(), "title", "guid", "http://127.0.0.1/nzb", "details", DownloadType.NZB, Instant.now());
        FileHandler spy = spy(testee);
        doThrow(new DownloadException("http://127.0.0.1/nzb", 521, "Web server is down")).when(spy).downloadFile(any());

        DownloadResult result = spy.handleContentDownload(SearchSource.INTERNAL, searchResult);

        assertThat(result.isSuccessful()).isFalse();
        assertThat(result.getStatusCode().value()).isEqualTo(521);
    }

    @Test
    void shouldCreateZipWithUnicodeEntryNames() throws Exception {
        String unicodeTitle = "Star ⭐️.nzb";
        byte[] content = "<nzb>test content</nzb>".getBytes();

        File tempFile = File.createTempFile("nzbhydra-safe-", ".nzb");
        tempFile.deleteOnExit();
        java.nio.file.Files.write(tempFile.toPath(), content);

        Map<File, String> fileToTitle = new LinkedHashMap<>();
        fileToTitle.put(tempFile, unicodeTitle);

        File zip = testee.createZip(fileToTitle);

        assertThat(zip).exists();
        try (ZipFile zipFile = new ZipFile(zip)) {
            assertThat(zipFile.size()).isEqualTo(1);
            assertThat(zipFile.getEntry(unicodeTitle)).isNotNull();
        }

        zip.delete();
    }

    @Test
    void shouldCreateZipWithMultipleUnicodeEntryNames() throws Exception {
        Map<File, String> fileToTitle = new LinkedHashMap<>();
        String[] titles = {
                "Normal title.nzb",
                "Mélissandre .nzb",
                "Star ⭐️.nzb"
        };

        for (String title : titles) {
            File tempFile = File.createTempFile("nzbhydra-safe-", ".nzb");
            tempFile.deleteOnExit();
            java.nio.file.Files.write(tempFile.toPath(), "content".getBytes());
            fileToTitle.put(tempFile, title);
        }

        File zip = testee.createZip(fileToTitle);

        assertThat(zip).exists();
        try (ZipFile zipFile = new ZipFile(zip)) {
            assertThat(zipFile.size()).isEqualTo(3);
            for (String title : titles) {
                assertThat(zipFile.getEntry(title))
                        .as("ZIP should contain entry with original Unicode name: " + title)
                        .isNotNull();
            }
        }

        zip.delete();
    }

    @Test
    void shouldCreateZipWithUniqueEntryNamesForDuplicateTitles() throws Exception {
        Map<File, String> fileToTitle = new LinkedHashMap<>();

        for (int i = 0; i < 2; i++) {
            File tempFile = File.createTempFile("nzbhydra-safe-", ".nzb");
            tempFile.deleteOnExit();
            java.nio.file.Files.write(tempFile.toPath(), ("content" + i).getBytes());
            fileToTitle.put(tempFile, "Duplicate title.nzb");
        }

        File zip = testee.createZip(fileToTitle);

        assertThat(zip).exists();
        try (ZipFile zipFile = new ZipFile(zip)) {
            assertThat(zipFile.size()).isEqualTo(2);
            assertThat(zipFile.getEntry("Duplicate title.nzb")).isNotNull();
            assertThat(zipFile.getEntry("Duplicate title_1.nzb")).isNotNull();

            Enumeration<? extends ZipEntry> entries = zipFile.entries();
            assertThat(entries.nextElement().getName()).isEqualTo("Duplicate title.nzb");
            assertThat(entries.nextElement().getName()).isEqualTo("Duplicate title_1.nzb");
        }

        zip.delete();
    }

    @Test
    void shouldCreateZipWithUniqueEntryNamesForSanitizedTitleCollisions() throws Exception {
        Map<File, String> fileToTitle = new LinkedHashMap<>();

        File firstFile = File.createTempFile("nzbhydra-safe-", ".nzb");
        firstFile.deleteOnExit();
        java.nio.file.Files.write(firstFile.toPath(), "content1".getBytes());
        fileToTitle.put(firstFile, "A_B.nzb");

        File secondFile = File.createTempFile("nzbhydra-safe-", ".nzb");
        secondFile.deleteOnExit();
        java.nio.file.Files.write(secondFile.toPath(), "content2".getBytes());
        fileToTitle.put(secondFile, "A_B.nzb");

        File zip = testee.createZip(fileToTitle);

        assertThat(zip).exists();
        try (ZipFile zipFile = new ZipFile(zip)) {
            assertThat(zipFile.size()).isEqualTo(2);
            assertThat(zipFile.getEntry("A_B.nzb")).isNotNull();
            assertThat(zipFile.getEntry("A_B_1.nzb")).isNotNull();
        }

        zip.delete();
    }

    @Test
    void shouldCleanUpZipFileWhenZipCreationFails() throws Exception {
        Map<File, String> fileToTitle = new LinkedHashMap<>();

        File goodFile = new File(tempDir.toFile(), "good.nzb");
        Files.write(goodFile.toPath(), "content".getBytes());
        fileToTitle.put(goodFile, "good.nzb");

        File missingFile = new File(tempDir.toFile(), "does-not-exist.nzb");
        fileToTitle.put(missingFile, "missing.nzb");

        assertThatThrownBy(() -> testee.createZip(fileToTitle)).isInstanceOf(IOException.class);

        assertThat(providedTempFiles)
                .as("The partially written ZIP file must be deleted when ZIP creation fails")
                .allMatch(x -> !x.exists());
        assertThat(testee.getTemporaryZipFiles())
                .as("A failed ZIP must not stay registered as temporary ZIP file")
                .isEmpty();
    }

    @Test
    void shouldRemoveTemporaryZipFilesOnCleanup() throws Exception {
        Map<File, String> fileToTitle = new LinkedHashMap<>();
        File tempFile = new File(tempDir.toFile(), "some.nzb");
        Files.write(tempFile.toPath(), "content".getBytes());
        fileToTitle.put(tempFile, "some.nzb");

        File zip = testee.createZip(fileToTitle);
        assertThat(testee.getTemporaryZipFiles()).hasSize(1);

        zip.setLastModified(System.currentTimeMillis() - 1000L * 60 * 60 * 24);
        testee.cleanUpTemporaryZipFiles();

        assertThat(testee.getTemporaryZipFiles()).isEmpty();
        assertThat(zip).doesNotExist();
    }

    @Test
    void shouldDeleteTempDirectoryWhenNoFilesCouldBeRetrieved() throws Exception {
        when(searchResultRepository.findByHash(anyLong())).thenReturn(Optional.empty());
        final Set<Path> before = listTempDirectories();

        final FileZipResponse response = testee.getFilesAsZip(List.of("123"));

        assertThat(response.isSuccessful()).isFalse();
        assertThat(listTempDirectories())
                .as("No temporary directory may be left behind when no files could be retrieved")
                .isEqualTo(before);
    }

    private Set<Path> listTempDirectories() throws IOException {
        try (Stream<Path> stream = Files.list(Path.of(System.getProperty("java.io.tmpdir")))) {
            return stream.filter(Files::isDirectory)
                    .filter(x -> x.getFileName().toString().startsWith("nzbhydra"))
                    .collect(Collectors.toSet());
        }
    }

    @Test
    void shouldAbortAfterTooManyRedirects() {
        SearchResultEntity searchResult = newSearchResult("http://127.0.0.1/nzb");
        AtomicInteger callCount = new AtomicInteger();
        mockHttp(request -> {
            int count = callCount.incrementAndGet();
            return buildResponse(request, 302, "http://127.0.0.1/redirect" + count, null);
        });

        assertThatThrownBy(() -> testee.downloadFile(searchResult))
                .isInstanceOf(DownloadException.class);
        assertThat(callCount.get())
                .as("Redirects must be limited to the initial request plus MAX_REDIRECTS follow-ups")
                .isEqualTo(6);
    }

    @Test
    void shouldNotChangeSearchResultLinkWhenFollowingRedirect() throws Exception {
        SearchResultEntity searchResult = newSearchResult("http://127.0.0.1/nzb");
        mockHttp(request -> {
            if (request.url().encodedPath().equals("/nzb")) {
                return buildResponse(request, 302, "http://127.0.0.1/actual", null);
            }
            return buildResponse(request, 200, null, "nzbcontent".getBytes());
        });

        final byte[] bytes = testee.downloadFile(searchResult);

        assertThat(new String(bytes)).isEqualTo("nzbcontent");
        assertThat(searchResult.getLink())
                .as("The link of the (managed) search result entity must not be overwritten with the redirect target")
                .isEqualTo("http://127.0.0.1/nzb");
    }

    @Test
    void shouldFollowRelativeRedirect() throws Exception {
        SearchResultEntity searchResult = newSearchResult("http://127.0.0.1/some/path/nzb");
        List<String> requestedUrls = new ArrayList<>();
        mockHttp(request -> {
            requestedUrls.add(request.url().toString());
            if (request.url().encodedPath().equals("/some/path/nzb")) {
                return buildResponse(request, 302, "/relative/path", null);
            }
            return buildResponse(request, 200, null, "nzbcontent".getBytes());
        });

        final byte[] bytes = testee.downloadFile(searchResult);

        assertThat(new String(bytes)).isEqualTo("nzbcontent");
        assertThat(requestedUrls)
                .as("A relative location header must be resolved against the requested URL")
                .containsExactly("http://127.0.0.1/some/path/nzb", "http://127.0.0.1/relative/path");
    }

    @Test
    void shouldThrowDownloadExceptionForUnresolvableRedirectTarget() {
        SearchResultEntity searchResult = newSearchResult("http://127.0.0.1/nzb");
        mockHttp(request -> buildResponse(request, 302, "ftp://example.com/file.nzb", null));

        assertThatThrownBy(() -> testee.downloadFile(searchResult))
                .isInstanceOf(DownloadException.class)
                .hasMessageContaining("Invalid redirect target");
    }

    private SearchResultEntity newSearchResult(String link) {
        return new SearchResultEntity(new IndexerEntity("indexerName"), Instant.now(), "title", "guid", link, "details", DownloadType.NZB, Instant.now());
    }

    private void mockHttp(java.util.function.Function<Request, Response> responseProvider) {
        final Indexer<?> indexer = mock(Indexer.class);
        when(indexer.getConfig()).thenReturn(new IndexerConfig());
        when(searchModuleProvider.getIndexerByName(anyString())).thenReturn(indexer);
        final OkHttpClient client = mock(OkHttpClient.class);
        when(clientHttpRequestFactory.getOkHttpClient(anyString(), any())).thenReturn(client);
        when(client.newCall(any())).thenAnswer(inv -> {
            final Request request = inv.getArgument(0);
            final Call call = mock(Call.class);
            when(call.execute()).thenReturn(responseProvider.apply(request));
            return call;
        });
    }

    private Response buildResponse(Request request, int code, String location, byte[] content) {
        final Response.Builder builder = new Response.Builder()
                .request(request)
                .protocol(Protocol.HTTP_1_1)
                .code(code)
                .message("message")
                .body(ResponseBody.create(content == null ? new byte[0] : content, MediaType.parse("application/xml")));
        if (location != null) {
            builder.header("location", location);
        }
        return builder.build();
    }
}
