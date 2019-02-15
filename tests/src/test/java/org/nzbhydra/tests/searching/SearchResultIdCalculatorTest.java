package org.nzbhydra.tests.searching;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.searching.SearchResultIdCalculator;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.test.autoconfigure.core.AutoConfigureCache;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.AutoConfigureDataJpa;
import org.springframework.boot.test.autoconfigure.orm.jpa.AutoConfigureTestEntityManager;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.Assert.assertEquals;

@RunWith(SpringRunner.class)
@SpringBootTest(classes = NzbHydra.class)
@Transactional
@AutoConfigureCache
@AutoConfigureDataJpa
@AutoConfigureTestDatabase
@AutoConfigureTestEntityManager
@ImportAutoConfiguration
public class SearchResultIdCalculatorTest {

    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    private IndexerRepository indexerRepository;


    @Test
    public void shouldCalculateSameSearchResultId() throws Exception {
        SearchResultEntity searchResultEntity = new SearchResultEntity();
        IndexerEntity indexerEntity = new IndexerEntity();
        indexerEntity.setName("indexerName");
        indexerEntity = indexerRepository.save(indexerEntity);
        searchResultEntity.setIndexer(indexerEntity);
        searchResultEntity.setIndexerGuid("indexerGuid");
        searchResultEntity.setTitle("title");
        searchResultEntity = searchResultRepository.save(searchResultEntity);

        assertEquals(-2991137394797183212L, SearchResultIdCalculator.calculateSearchResultId(searchResultEntity));
        assertEquals(-2991137394797183212L, searchResultEntity.getId());

        assertEquals(searchResultEntity, searchResultRepository.findById(-2991137394797183212L).get());
    }

}