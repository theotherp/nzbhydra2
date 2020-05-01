/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.downloading;

import com.google.common.collect.Sets;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.junit.Before;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.uniqueness.IndexerUniquenessScoreEntity;
import org.nzbhydra.searching.uniqueness.IndexerUniquenessScoreEntityRepository;

import javax.persistence.EntityManagerFactory;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class IndexerUniquenessScoreSaverTest {

    @Mock
    private SearchResultRepository searchResultRepository;
    @Mock
    private IndexerSearchRepository indexerSearchRepository;
    @Mock
    private IndexerUniquenessScoreEntityRepository indexerUniquenessScoreEntityRepository;
    @Captor
    private ArgumentCaptor<List<IndexerUniquenessScoreEntity>> scoreCaptor;
    @Captor
    private ArgumentCaptor<String> searchCaptor;
    @Mock
    private ConfigProvider configProviderMock;
    @Mock
    private EntityManagerFactory entityManagerFactory;
    @Mock
    private SessionFactory sessionFactoryMock;
    @Mock
    private Session sessionMock;


    @InjectMocks
    private IndexerUniquenessScoreSaver testee = new IndexerUniquenessScoreSaver();

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        final BaseConfig value = new BaseConfig();
        value.getMain().setKeepHistory(true);
        when(configProviderMock.getBaseConfig()).thenReturn(value);
        when(entityManagerFactory.unwrap(any())).thenReturn(sessionFactoryMock);
        when(sessionFactoryMock.openSession()).thenReturn(sessionMock);

    }

    // TODO Fix (sessionMock doesn't work)
//    @Test
    public void testWithTwoOutOfThree() {
        SearchEntity searchEntity = new SearchEntity();

        IndexerEntity indexerHasDownloaded = new IndexerEntity("indexerHasDownloaded");
        indexerHasDownloaded.setName("indexerHasDownloaded");
        indexerHasDownloaded.setId(1);

        IndexerEntity indexerhasToo = new IndexerEntity("indexerhasToo");
        indexerhasToo.setName("indexerHasDownloaded");
        indexerhasToo.setId(2);

        IndexerEntity indexerHasNot = new IndexerEntity("indexerHasNot");
        indexerHasNot.setName("indexerHasNot");
        indexerHasNot.setId(3);

        IndexerSearchEntity indexerSearchEntityHasDownloaded = new IndexerSearchEntity(indexerHasDownloaded, searchEntity);
        indexerSearchEntityHasDownloaded.setSuccessful(true);
        IndexerSearchEntity indexerSearchEntityhasToo = new IndexerSearchEntity(indexerhasToo, searchEntity);
        indexerSearchEntityhasToo.setSuccessful(true);
        IndexerSearchEntity indexerSearchEntityHasNot = new IndexerSearchEntity(indexerHasNot, searchEntity);
        indexerSearchEntityHasNot.setSuccessful(true);

        SearchResultEntity searchResultEntityHasDownloaded = new SearchResultEntity(indexerHasDownloaded, Instant.now(), "Some.result-with_different.Characters", "", "", "", null, Instant.now());
        searchResultEntityHasDownloaded.setIndexerSearchEntity(indexerSearchEntityHasDownloaded);
        SearchResultEntity searchResultEntityhasToo = new SearchResultEntity(indexerhasToo, Instant.now(), "", "", "", "", null, null);
        searchResultEntityhasToo.setIndexerSearchEntity(indexerSearchEntityhasToo);
        SearchResultEntity searchResultEntityhasNot = new SearchResultEntity(indexerHasNot, Instant.now(), "", "", "", "", null, null);
        searchResultEntityhasNot.setIndexerSearchEntity(indexerSearchEntityHasNot);

        FileDownloadEntity fileDownloadEntity = new FileDownloadEntity(searchResultEntityHasDownloaded, FileDownloadAccessType.REDIRECT, SearchRequest.SearchSource.API, FileDownloadStatus.NONE, null);
        FileDownloadEvent downloadEvent = new FileDownloadEvent(fileDownloadEntity, searchResultEntityHasDownloaded);

        when(searchResultRepository.findAllByTitleLikeIgnoreCase(anyString())).thenReturn(Sets.newHashSet(searchResultEntityHasDownloaded, searchResultEntityhasToo));
        when(indexerSearchRepository.findBySearchEntity(searchEntity)).thenReturn(Sets.newHashSet(indexerSearchEntityHasDownloaded, indexerSearchEntityhasToo, indexerSearchEntityHasNot));

        testee.onNzbDownloadEvent(downloadEvent);
        when(sessionMock.load(ArgumentMatchers.eq(SearchResultEntity.class), any())).thenReturn(new SearchResultEntity());

        verify(indexerUniquenessScoreEntityRepository).saveAll(scoreCaptor.capture());
        assertThat(scoreCaptor.getValue()).hasSize(3);

        IndexerUniquenessScoreEntity score1 = scoreCaptor.getValue().get(0);
        assertThat(score1.getIndexer()).isEqualTo(indexerHasDownloaded);
        assertThat(score1.getInvolved()).isEqualTo(3);
        assertThat(score1.getHave()).isEqualTo(2);
        assertThat(score1.isHasResult()).isTrue();

        IndexerUniquenessScoreEntity score2 = scoreCaptor.getValue().get(1);
        assertThat(score2.getIndexer()).isEqualTo(indexerhasToo);
        assertThat(score2.getInvolved()).isEqualTo(3);
        assertThat(score2.getHave()).isEqualTo(2);
        assertThat(score2.isHasResult()).isTrue();

        IndexerUniquenessScoreEntity score3 = scoreCaptor.getValue().get(2);
        assertThat(score3.getIndexer()).isEqualTo(indexerHasNot);
        assertThat(score3.getInvolved()).isEqualTo(3);
        assertThat(score3.getHave()).isEqualTo(2);
        assertThat(score3.isHasResult()).isFalse();

        verify(searchResultRepository).findAllByTitleLikeIgnoreCase("Some_result_with_different_Characters");
    }

    // TODO Fix (sessionMock doesn't work)
//    @Test
    public void testWithOneOutOfThree() {
        SearchEntity searchEntity = new SearchEntity();

        IndexerEntity indexerHasDownloaded = new IndexerEntity("indexerHasDownloaded");
        indexerHasDownloaded.setId(1);
        IndexerEntity indexerHasNot = new IndexerEntity("indexerHasNot");
        indexerHasNot.setId(2);
        IndexerEntity indexerHasNot2 = new IndexerEntity("indexerHasNot2");
        indexerHasNot2.setId(3);

        IndexerSearchEntity indexerSearchEntityHasDownloaded = new IndexerSearchEntity(indexerHasDownloaded, searchEntity);
        indexerSearchEntityHasDownloaded.setSuccessful(true);
        indexerSearchEntityHasDownloaded.setId(1);
        IndexerSearchEntity indexerSearchEntityhasNot2 = new IndexerSearchEntity(indexerHasNot2, searchEntity);
        indexerSearchEntityhasNot2.setSuccessful(true);
        indexerSearchEntityhasNot2.setId(2);
        IndexerSearchEntity indexerSearchEntityHasNot = new IndexerSearchEntity(indexerHasNot, searchEntity);
        indexerSearchEntityHasNot.setSuccessful(true);
        indexerSearchEntityHasNot.setId(3);

        SearchResultEntity searchResultEntityHasDownloaded = new SearchResultEntity(indexerHasDownloaded, Instant.now(), "", "", "", "", null, Instant.now());
        searchResultEntityHasDownloaded.setIndexerSearchEntity(indexerSearchEntityHasDownloaded);
        SearchResultEntity searchResultEntityhasNot2 = new SearchResultEntity(indexerHasNot2, Instant.now(), "", "", "", "", null, null);
        searchResultEntityhasNot2.setIndexerSearchEntity(indexerSearchEntityhasNot2);
        SearchResultEntity searchResultEntityhasNot = new SearchResultEntity(indexerHasNot, Instant.now(), "", "", "", "", null, null);
        searchResultEntityhasNot.setIndexerSearchEntity(indexerSearchEntityHasNot);

        FileDownloadEntity fileDownloadEntity = new FileDownloadEntity(searchResultEntityHasDownloaded, FileDownloadAccessType.REDIRECT, SearchRequest.SearchSource.API, FileDownloadStatus.NONE, null);
        FileDownloadEvent downloadEvent = new FileDownloadEvent(fileDownloadEntity, searchResultEntityHasDownloaded);

        when(searchResultRepository.findAllByTitleLikeIgnoreCase(anyString())).thenReturn(Sets.newHashSet(searchResultEntityHasDownloaded));
        HashSet<IndexerSearchEntity> involvedIndexers = Sets.newHashSet(indexerSearchEntityHasDownloaded, indexerSearchEntityHasNot, indexerSearchEntityhasNot2);
        when(indexerSearchRepository.findBySearchEntity(searchEntity)).thenReturn(involvedIndexers);

        testee.onNzbDownloadEvent(downloadEvent);

        verify(indexerUniquenessScoreEntityRepository).saveAll(scoreCaptor.capture());
        List<IndexerUniquenessScoreEntity> scores = scoreCaptor.getValue();
        scores.sort(Comparator.comparing(x -> x.getIndexer().getName()));
        assertThat(scores).hasSize(3);

        IndexerUniquenessScoreEntity score1 = scores.get(0);
        assertThat(score1.getIndexer()).isEqualTo(indexerHasDownloaded);
        assertThat(score1.getInvolved()).isEqualTo(3);
        assertThat(score1.getHave()).isEqualTo(1);
        assertThat(score1.isHasResult()).isTrue();

        IndexerUniquenessScoreEntity score2 = scores.get(1);
        assertThat(score2.getIndexer()).isEqualTo(indexerHasNot);
        assertThat(score2.getInvolved()).isEqualTo(3);
        assertThat(score2.getHave()).isEqualTo(1);
        assertThat(score2.isHasResult()).isFalse();

        IndexerUniquenessScoreEntity score3 = scores.get(2);
        assertThat(score3.getIndexer()).isEqualTo(indexerHasNot2);
        assertThat(score3.getInvolved()).isEqualTo(3);
        assertThat(score3.getHave()).isEqualTo(1);
        assertThat(score3.isHasResult()).isFalse();
    }
}
