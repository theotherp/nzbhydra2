package org.nzbhydra.indexers.capscheck;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.CheckCapsResponse;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.IndexerWebAccess;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.searching.SearchModuleProvider;
import org.springframework.context.ApplicationEventPublisher;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.nzbhydra.config.validation.SensitiveDataConfigValidator.UNCHANGED_MARKER;

/**
 * The checks that run before a config is saved get the indexer as the UI has it, with its saved secrets masked. They
 * must use the secrets of the same stored indexer (by id) and must not contact the indexer when they cannot find them.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class IndexerCheckerUnchangedMarkerTest {

    @Mock
    private IndexerWebAccess indexerWebAccess;
    @Mock
    private ConfigProvider configProvider;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private SearchModuleProvider searchModuleProvider;
    @InjectMocks
    private IndexerChecker indexerChecker = new IndexerChecker();
    @InjectMocks
    private SimpleConnectionChecker simpleConnectionChecker = new SimpleConnectionChecker();

    @BeforeEach
    void setUp() {
        final BaseConfig baseConfig = new BaseConfig();
        baseConfig.setIndexers(new ArrayList<>(List.of(
            indexer("id-a", "A", "key-a", "user-a", "password-a"),
            indexer("id-b", "B", "key-b", "user-b", "password-b"))));
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        IndexerChecker.PAUSE_BETWEEN_CALLS = 0;
    }

    private static IndexerConfig indexer(String id, String name, String apiKey, String username, String password) {
        final IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setId(id);
        indexerConfig.setName(name);
        indexerConfig.setHost("http://127.0.0.1:1234");
        indexerConfig.setApiKey(apiKey);
        indexerConfig.setUsername(username);
        indexerConfig.setPassword(password);
        indexerConfig.setSearchModuleType(SearchModuleType.NEWZNAB);
        return indexerConfig;
    }

    @Test
    void shouldUseTheSecretsOfTheSameIndexerAfterARenameWhenCheckingTheConnection() throws Exception {
        //B was renamed to "A" in the dialog - the name now points at the wrong stored indexer, the id does not
        final IndexerConfig submitted = indexer("id-b", "A", UNCHANGED_MARKER, UNCHANGED_MARKER, UNCHANGED_MARKER);
        when(indexerWebAccess.get(any(URI.class), any(IndexerConfig.class))).thenThrow(new IndexerAccessException("unreachable"));

        indexerChecker.checkConnection(submitted);

        final ArgumentCaptor<URI> uriCaptor = ArgumentCaptor.forClass(URI.class);
        verify(indexerWebAccess, atLeastOnce()).get(uriCaptor.capture(), eq(submitted));
        assertThat(uriCaptor.getValue().toString()).contains("apikey=key-b").doesNotContain("UNCHANGED");
        assertThat(submitted.getUsername()).contains("user-b");
        assertThat(submitted.getPassword()).contains("password-b");
    }

    @Test
    void shouldNotContactTheIndexerWhenTheSecretCannotBeResolvedForAConnectionCheck() {
        final IndexerConfig submitted = indexer(null, "Brand new", UNCHANGED_MARKER, null, null);

        final GenericResponse response = indexerChecker.checkConnection(submitted);

        assertThat(response.isSuccessful()).isFalse();
        assertThat(response.getMessage()).contains("Please enter the API key again");
        verifyNoInteractions(indexerWebAccess);
    }

    @Test
    void shouldNotContactTheIndexerWhenTheIdIsUnknownForAConnectionCheck() {
        //An id is matched by id only, even when the name would match a stored indexer
        final IndexerConfig submitted = indexer("id-deleted", "A", UNCHANGED_MARKER, null, null);

        final GenericResponse response = indexerChecker.checkConnection(submitted);

        assertThat(response.isSuccessful()).isFalse();
        verifyNoInteractions(indexerWebAccess);
    }

    @Test
    void shouldUseTheSecretsOfTheSameIndexerForCapsCheckAndNotReturnThem() throws Exception {
        final IndexerConfig submitted = indexer("id-b", "B renamed", UNCHANGED_MARKER, null, null);
        when(indexerWebAccess.get(any(URI.class), any(IndexerConfig.class))).thenThrow(new IndexerAccessException("unreachable"));
        when(indexerWebAccess.get(any(URI.class), any(IndexerConfig.class), any())).thenThrow(new IndexerAccessException("unreachable"));

        final CheckCapsResponse response = indexerChecker.checkCaps(submitted);

        final ArgumentCaptor<URI> uriCaptor = ArgumentCaptor.forClass(URI.class);
        verify(indexerWebAccess, atLeastOnce()).get(uriCaptor.capture(), any(IndexerConfig.class));
        assertThat(uriCaptor.getAllValues()).allSatisfy(uri -> assertThat(uri.toString()).contains("apikey=key-b"));
        assertThat(response.getIndexerConfig().getApiKey())
            .as("The response goes back to the UI, which only knew the marker")
            .isEqualTo(UNCHANGED_MARKER);
    }

    @Test
    void shouldNotContactTheIndexerWhenTheSecretCannotBeResolvedForACapsCheck() {
        final IndexerConfig submitted = indexer(null, "Brand new", UNCHANGED_MARKER, null, null);

        final CheckCapsResponse response = indexerChecker.checkCaps(submitted);

        assertThat(response.isConfigComplete()).isFalse();
        assertThat(response.isAllCapsChecked()).isFalse();
        assertThat(response.getIndexerConfig().isConfigComplete()).isFalse();
        verifyNoInteractions(indexerWebAccess);
        final ArgumentCaptor<Object> eventCaptor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertThat(((IndexerChecker.CheckerEvent) eventCaptor.getValue()).getMessage()).contains("Please enter the API key again");
    }

    @Test
    void shouldUseTheSecretsOfTheSameIndexerAfterARenameInTheSimpleConnectionCheck() throws Exception {
        final IndexerConfig submitted = indexer("id-a", "Renamed", null, UNCHANGED_MARKER, UNCHANGED_MARKER);
        submitted.setSearchModuleType(SearchModuleType.NZBINDEX);

        final GenericResponse response = simpleConnectionChecker.checkConnection(submitted);

        assertThat(response.isSuccessful()).isTrue();
        final ArgumentCaptor<IndexerConfig> configCaptor = ArgumentCaptor.forClass(IndexerConfig.class);
        verify(indexerWebAccess).get(any(URI.class), configCaptor.capture(), eq(String.class));
        assertThat(configCaptor.getValue().getUsername()).contains("user-a");
        assertThat(configCaptor.getValue().getPassword()).contains("password-a");
    }

    @Test
    void shouldNotContactTheIndexerWhenTheSecretCannotBeResolvedInTheSimpleConnectionCheck() throws Exception {
        final IndexerConfig submitted = indexer(null, "Renamed", null, UNCHANGED_MARKER, UNCHANGED_MARKER);
        submitted.setSearchModuleType(SearchModuleType.NZBINDEX);

        final GenericResponse response = simpleConnectionChecker.checkConnection(submitted);

        assertThat(response.isSuccessful()).isFalse();
        assertThat(response.getMessage()).contains("Please enter the username and password again");
        verify(indexerWebAccess, never()).get(any(URI.class), any(IndexerConfig.class), any());
    }
}
