package org.nzbhydra.tests.searching;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.database.IndexerEntity;
import org.nzbhydra.database.IndexerRepository;
import org.nzbhydra.database.SearchResultEntity;
import org.nzbhydra.database.SearchResultRepository;
import org.nzbhydra.searching.SearchResultIdCalculator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit4.SpringRunner;

import static org.junit.Assert.assertEquals;

@RunWith(SpringRunner.class)
@SpringBootTest(classes = NzbHydra.class)
@DataJpaTest
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
        searchResultEntity = searchResultRepository.save(searchResultEntity);

        assertEquals(-1682031170, SearchResultIdCalculator.calculateSearchResultId(searchResultEntity));
        assertEquals(-1682031170, searchResultEntity.getId());

        assertEquals(searchResultEntity, searchResultRepository.findOne(-1682031170));
    }

}