package org.nzbhydra.migration;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;
import org.mockito.*;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.db.IdentifierKeyValuePair;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchRepository;
import org.nzbhydra.searching.dtoseventsenums.SearchType;

import java.sql.Connection;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.Assert.assertThat;
import static org.mockito.Mockito.when;

public class SqliteMigrationTest {

    @Mock
    private CategoryProvider categoryProviderMock;
    Category categoryAll = new Category("All");
    Category categoryMovies = new Category("Movies");
    Category categoryTv = new Category("TV");
    @Mock
    private SearchRepository searchRepositoryMock;
    @Mock
    private IndexerSearchRepository indexerSearchRepositoryMock;
    @Mock
    private IndexerRepository indexerRepositoryMock;
    @Captor
    private ArgumentCaptor<SearchEntity> searchEntityCaptor;
    @Mock
    private SearchEntity searchEntityMock2;
    @Mock
    private SearchEntity searchEntityMock4;
    @Mock
    private IndexerEntity indexerEntityMock23;
    @Mock
    private IndexerEntity indexerEntityMock26;
    @Mock
    private IndexerEntity indexerEntityMock25;
    @Mock
    private IndexerEntity indexerEntityMock22;
    @Mock
    private IndexerEntity indexerEntityMock3;
    @Mock
    Connection connectionMock;
    private Map<Integer, IndexerEntity> oldIdToIndexersMap;
    private Map<Integer, SearchEntity> oldIdToSearchesMap;


    @InjectMocks
    private SqliteMigration testee = new SqliteMigration();

    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        when(categoryProviderMock.getCategories()).thenReturn(Arrays.asList(categoryAll, categoryMovies, categoryTv));
        when(searchRepositoryMock.save(searchEntityCaptor.capture())).thenAnswer(invocation -> invocation.getArgument(0));
        oldIdToIndexersMap = new HashMap<>();
        oldIdToIndexersMap.put(3, indexerEntityMock3);
        oldIdToIndexersMap.put(22, indexerEntityMock22);
        oldIdToIndexersMap.put(23, indexerEntityMock23);
        oldIdToIndexersMap.put(25, indexerEntityMock25);
        oldIdToIndexersMap.put(26, indexerEntityMock26);

        oldIdToSearchesMap = new HashMap<>();
        oldIdToSearchesMap.put(2, searchEntityMock2);
        oldIdToSearchesMap.put(4, searchEntityMock4);

        testee.connection = connectionMock;
    }


    //TODO tests are still for old json based sqlite migration, need to be adapted to actual sqlite access

    @Test
    @Ignore
    public void shouldMigrateSearches() throws Exception {
        String searchesJson = Resources.toString(Resources.getResource(SqliteMigrationTest.class, "searches"), Charsets.UTF_8);
        List<Map<String, Object>> oldSearches = testee.objectMapper.readValue(searchesJson, testee.listOfMapsTypeReference);
        Map<Integer, SearchEntity> searchEntities = testee.migrateSearches();
        assertThat(searchEntities.size(), is(4));

        SearchEntity entityTv = searchEntities.get(3);
        assertThat(entityTv.getAuthor(), is(nullValue()));
        assertThat(entityTv.getUsername(), is(nullValue()));
        assertThat(entityTv.getSeason(), is(1));
        assertThat(entityTv.getEpisode(), is(2));
        assertThat(entityTv.getIdentifiers().size(), is(1));
        IdentifierKeyValuePair keyValuePair = entityTv.getIdentifiers().iterator().next();
        assertThat(keyValuePair.getIdentifierKey(), is(IdType.TVDB.name()));
        assertThat(keyValuePair.getIdentifierValue(), is("456"));
        assertThat(entityTv.getQuery(), is(nullValue()));
        assertThat(entityTv.getSearchType(), is(SearchType.TVSEARCH));
        assertThat(entityTv.getCategoryName(), is("TV"));

        SearchEntity entityAll = searchEntities.get(2);
        assertThat(entityAll.getAuthor(), is(nullValue()));
        assertThat(entityAll.getUsername(), is(nullValue()));
        assertThat(entityAll.getEpisode(), is(nullValue()));
        assertThat(entityAll.getSeason(), is(nullValue()));
        assertThat(entityAll.getIdentifiers(), is(empty()));
        assertThat(entityAll.getQuery(), is("aquery"));
        assertThat(entityAll.getSearchType(), is(SearchType.SEARCH));
        assertThat(entityAll.getCategoryName(), is("All"));
    }

    @Test
    public void bla() throws Exception {
        String a = "2018-01-06 18:16:22.285000";
        testee.timestampToInstant(a);

        a = "2018-01-06 18:16:22";
        testee.timestampToInstant(a);

        a = "2018-01-06 18:16:22.365000+00:00";
        testee.timestampToInstant(a);

        a = "2016-03-26 22:16:52+00:00";
        testee.timestampToInstant(a);

    }

}