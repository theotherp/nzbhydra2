package org.nzbhydra.historystats;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.downloading.FileDownloadRepository;
import org.nzbhydra.historystats.stats.AverageResponseTime;
import org.nzbhydra.historystats.stats.CountPerDayOfWeek;
import org.nzbhydra.historystats.stats.CountPerHourOfDay;
import org.nzbhydra.historystats.stats.DownloadPerAge;
import org.nzbhydra.historystats.stats.DownloadPerAgeStats;
import org.nzbhydra.historystats.stats.IndexerApiAccessStatsEntry;
import org.nzbhydra.historystats.stats.IndexerDownloadShare;
import org.nzbhydra.historystats.stats.StatsRequest;
import org.nzbhydra.indexers.IndexerAccessResult;
import org.nzbhydra.indexers.IndexerApiAccessEntity;
import org.nzbhydra.indexers.IndexerApiAccessRepository;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.searching.SearchModuleConfigProvider;
import org.nzbhydra.searching.SearchModuleProvider;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchRepository;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

@SuppressWarnings("SpringJavaAutowiringInspection")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
@ExtendWith(SpringExtension.class)
@SpringBootTest(classes = NzbHydra.class)
public class StatsComponentTest {

    private IndexerEntity indexer1;
    private IndexerEntity indexer2;
    private IndexerConfig indexerConfig1;
    private IndexerConfig indexerConfig2;

    @Autowired
    private SearchModuleConfigProvider searchModuleConfigProvider;
    @Autowired
    private SearchModuleProvider searchModuleProvider;
    @Autowired
    private IndexerApiAccessRepository apiAccessRepository;
    @Autowired
    private IndexerRepository indexerRepository;
    @Autowired
    private SearchRepository searchRepository;
    @Autowired
    private FileDownloadRepository downloadRepository;
    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    private IndexerSearchRepository indexerSearchRepository;

    @Autowired
    private Stats stats;

    @BeforeEach
    public void setUp() {
//        indexerRepository.deleteAll();
//        apiAccessRepository.deleteAll();
        indexerConfig1 = new IndexerConfig();
        indexerConfig1.setName("indexer1");
        indexerConfig1.setSearchModuleType(SearchModuleType.NEWZNAB);
        indexerConfig1.setState(IndexerConfig.State.ENABLED);
        indexerConfig1.setHost("somehost");
        indexerConfig2 = new IndexerConfig();
        indexerConfig2.setName("indexer2");
        indexerConfig2.setSearchModuleType(SearchModuleType.NEWZNAB);
        indexerConfig2.setState(IndexerConfig.State.DISABLED_USER);
        indexerConfig2.setHost("somehost");
        searchModuleConfigProvider.setIndexers(Arrays.asList(indexerConfig1, indexerConfig2));
        searchModuleProvider.loadIndexers(Arrays.asList(indexerConfig1, indexerConfig2));
        indexer1 = indexerRepository.findByName("indexer1");
        indexer2 = indexerRepository.findByName("indexer2");
    }

    @Test
    void shouldCalculateAverageResponseTimes() throws Exception {
        assertThat(indexerRepository.count()).isEqualTo(2);

        IndexerApiAccessEntity apiAccess1 = new IndexerApiAccessEntity(indexer1);
        apiAccess1.setResponseTime(1000L);
        apiAccess1.setTime(Instant.now().minus(1, ChronoUnit.DAYS));
        apiAccessRepository.save(apiAccess1);

        IndexerApiAccessEntity apiAccess2 = new IndexerApiAccessEntity(indexer1);
        apiAccess2.setResponseTime(2000L);
        apiAccess2.setTime(Instant.now().minus(1, ChronoUnit.DAYS));
        apiAccessRepository.save(apiAccess2);

        IndexerApiAccessEntity apiAccess3 = new IndexerApiAccessEntity(indexer1);
        apiAccess3.setResponseTime(4000L);
        apiAccess3.setTime(Instant.now().minus(100, ChronoUnit.DAYS));
        apiAccessRepository.save(apiAccess3);

        //Access #3 is not included
        List<AverageResponseTime> averageResponseTimes = stats.averageResponseTimes(new StatsRequest(Instant.now().minus(10, ChronoUnit.DAYS), Instant.now(), true));
        assertThat(averageResponseTimes).hasSize(1);
        assertThat(averageResponseTimes.get(0).getAvgResponseTime()).isCloseTo(1500D, within(0D));

        //Access #3 is included
        averageResponseTimes = stats.averageResponseTimes(new StatsRequest(Instant.now().minus(101, ChronoUnit.DAYS), Instant.now(), true));
        assertThat(averageResponseTimes).hasSize(1);
        assertThat(averageResponseTimes.get(0).getAvgResponseTime()).isCloseTo(2333D, within(0D));
    }

    @Test
    void shouldCalculateSearchesPerDayOfWeek() throws Exception {
        SearchEntity searchFriday = new SearchEntity();
        searchFriday.setTime(Instant.ofEpochSecond(1490945310L)); //Friday
        SearchEntity searchThursday1 = new SearchEntity();
        searchThursday1.setTime(Instant.ofEpochSecond(1490858910L)); //Thursday
        SearchEntity searchThursday2 = new SearchEntity();
        searchThursday2.setTime(Instant.ofEpochSecond(1490858910L)); //Thursday
        SearchEntity searchSunday = new SearchEntity();
        searchSunday.setTime(Instant.ofEpochSecond(1490513310L)); //Sunday
        searchRepository.saveAll(Arrays.asList(searchFriday, searchThursday1, searchThursday2, searchSunday));


        StatsRequest statsRequest = new StatsRequest(searchFriday.getTime().minus(10, ChronoUnit.DAYS), searchFriday.getTime().plus(10, ChronoUnit.DAYS), true);
        List<CountPerDayOfWeek> result = stats.countPerDayOfWeek("SEARCH", statsRequest);
        assertThat(result).hasSize(7);

        assertThat(result.get(3).getDay()).isEqualTo("Thu");
        assertThat(result.get(3).getCount()).isEqualTo(Integer.valueOf(2));

        assertThat(result.get(4).getDay()).isEqualTo("Fri");
        assertThat(result.get(4).getCount()).isEqualTo(Integer.valueOf(1));

        assertThat(result.get(6).getDay()).isEqualTo("Sun");
        assertThat(result.get(6).getCount()).isEqualTo(Integer.valueOf(1));
    }

    @Test
    void shouldCalculateDownloadsPerDayOfWeek() throws Exception {

        FileDownloadEntity downloadFriday = new FileDownloadEntity();
        downloadFriday.setTime(Instant.ofEpochSecond(1490945310L)); //Friday

        FileDownloadEntity downloadThursday1 = new FileDownloadEntity();
        downloadThursday1.setTime(Instant.ofEpochSecond(1490858910L)); //Thursday

        FileDownloadEntity downloadThursday2 = new FileDownloadEntity();
        downloadThursday2.setTime(Instant.ofEpochSecond(1490858910L)); //Thursday


        FileDownloadEntity downloadSunday = new FileDownloadEntity();
        downloadSunday.setTime(Instant.ofEpochSecond(1490513310L)); //Sunday

        downloadRepository.saveAll(Arrays.asList(downloadFriday, downloadSunday, downloadThursday1, downloadThursday2));


        List<CountPerDayOfWeek> result = stats.countPerDayOfWeek("INDEXERNZBDOWNLOAD", new StatsRequest(downloadFriday.getTime().minus(10, ChronoUnit.DAYS), downloadFriday.getTime().plus(10, ChronoUnit.DAYS), true));
        assertThat(result).hasSize(7);

        assertThat(result.get(3).getDay()).isEqualTo("Thu");
        assertThat(result.get(3).getCount()).isEqualTo(Integer.valueOf(2));

        assertThat(result.get(4).getDay()).isEqualTo("Fri");
        assertThat(result.get(4).getCount()).isEqualTo(Integer.valueOf(1));

        assertThat(result.get(6).getDay()).isEqualTo("Sun");
        assertThat(result.get(6).getCount()).isEqualTo(Integer.valueOf(1));
    }

    @Test
    void shouldCalculateDownloadsAges() throws Exception {

        FileDownloadEntity download1 = new FileDownloadEntity();
        download1.setAge(10);
        FileDownloadEntity download2 = new FileDownloadEntity();
        download2.setAge(1000);
        FileDownloadEntity download3 = new FileDownloadEntity();
        download3.setAge(1500);
        FileDownloadEntity download4 = new FileDownloadEntity();
        download4.setAge(2001);
        FileDownloadEntity download5 = new FileDownloadEntity();
        download5.setAge(3499);
        FileDownloadEntity download6 = new FileDownloadEntity();
        download6.setAge(3400);

        downloadRepository.saveAll(Arrays.asList(download1, download2, download3, download4, download5, download6));

        List<DownloadPerAge> downloadPerAges = stats.downloadsPerAge();
        assertThat(downloadPerAges.get(34).getAge()).isEqualTo(3400);
        assertThat(downloadPerAges.get(34).getCount()).isEqualTo(2);

        DownloadPerAgeStats downloadPerAgeStats = stats.downloadsPerAgeStats();
        assertThat(downloadPerAgeStats.getAverageAge()).isEqualTo(1901);
        assertThat(downloadPerAgeStats.getPercentOlder1000()).isEqualTo(66);
        assertThat(downloadPerAgeStats.getPercentOlder2000()).isEqualTo(50);
        assertThat(downloadPerAgeStats.getPercentOlder3000()).isEqualTo(33);
    }

    @Test
    void shouldCalculateIndexerDownloadShares() throws Exception {
        FileDownloadEntity download1 = new FileDownloadEntity();
        SearchResultEntity searchResultEntity1 = getSearchResultEntity(indexer1, "1");
        download1.setSearchResult(searchResultEntity1);

        FileDownloadEntity download2 = new FileDownloadEntity();
        SearchResultEntity searchResultEntity2 = getSearchResultEntity(indexer1, "2");
        download2.setSearchResult(searchResultEntity2);

        FileDownloadEntity download3 = new FileDownloadEntity();
        SearchResultEntity searchResultEntity3 = getSearchResultEntity(indexer1, "3");
        download3.setSearchResult(searchResultEntity3);

        FileDownloadEntity download4 = new FileDownloadEntity();
        SearchResultEntity searchResultEntity4 = getSearchResultEntity(indexer1, "4");
        download4.setSearchResult(searchResultEntity4);

        FileDownloadEntity download5 = new FileDownloadEntity();
        SearchResultEntity searchResultEntity5 = getSearchResultEntity(indexer2, "5");
        download5.setSearchResult(searchResultEntity5);

        FileDownloadEntity download6 = new FileDownloadEntity();
        SearchResultEntity searchResultEntity6 = getSearchResultEntity(indexer2, "6");
        download6.setSearchResult(searchResultEntity6);

        searchResultRepository.saveAll(Arrays.asList(searchResultEntity1, searchResultEntity2, searchResultEntity3, searchResultEntity4, searchResultEntity5, searchResultEntity6));
        downloadRepository.saveAll(Arrays.asList(download1, download2, download3, download4, download5, download6));

        List<IndexerDownloadShare> shares = stats.indexerDownloadShares(new StatsRequest(Instant.now().minus(100, ChronoUnit.DAYS), Instant.now().plus(1, ChronoUnit.DAYS), true));
        assertThat(shares.get(0).getIndexerName()).isEqualTo("indexer1");
        assertThat((int) shares.get(0).getShare()).isEqualTo(66);
        assertThat((int) shares.get(1).getShare()).isEqualTo(33);
    }

    protected SearchResultEntity getSearchResultEntity(IndexerEntity indexer1, String title) {
        SearchResultEntity searchResultEntity1 = new SearchResultEntity();
        searchResultEntity1.setIndexer(indexer1);
        searchResultEntity1.setTitle(title);
        searchResultEntity1.setIndexerGuid(title);
        return searchResultEntity1;
    }

    //Doesn't run on CircleCI for some reason
    @Test
    @Disabled
    void shouldCalculateSearchesPerHourOfDay() throws Exception {
        SearchEntity search12 = new SearchEntity();
        search12.setTime(Instant.ofEpochSecond(1490955803L));
        SearchEntity search16a = new SearchEntity();
        search16a.setTime(Instant.ofEpochSecond(1490971572L));
        SearchEntity search16b = new SearchEntity();
        search16b.setTime(Instant.ofEpochSecond(1490971572L));
        SearchEntity search23 = new SearchEntity();
        search23.setTime(Instant.ofEpochSecond(1490996779L));
        searchRepository.saveAll(Arrays.asList(search12, search16a, search16b, search23));

        List<CountPerHourOfDay> result = stats.countPerHourOfDay("SEARCH", new StatsRequest(search12.getTime().minus(10, ChronoUnit.DAYS), search12.getTime().plus(10, ChronoUnit.DAYS), true));
        assertThat(result).hasSize(24);
        assertThat(result.get(12).getCount()).isEqualTo(Integer.valueOf(1));
        assertThat(result.get(16).getCount()).isEqualTo(Integer.valueOf(2));
        assertThat(result.get(23).getCount()).isEqualTo(Integer.valueOf(1));
    }

    @Test
    void shouldCalculateIndexerApiAccessStats() throws Exception {
        IndexerApiAccessEntity apiAccess1 = new IndexerApiAccessEntity(indexer1);
        apiAccess1.setResult(IndexerAccessResult.CONNECTION_ERROR); //Counted as failed
        apiAccess1.setTime(Instant.now().minus(24, ChronoUnit.HOURS));
        apiAccessRepository.save(apiAccess1);

        IndexerApiAccessEntity apiAccess2 = new IndexerApiAccessEntity(indexer1);
        apiAccess2.setResult(IndexerAccessResult.HYDRA_ERROR); //Neither counted as successful nor as failed
        apiAccessRepository.save(apiAccess2);

        IndexerApiAccessEntity apiAccess3 = new IndexerApiAccessEntity(indexer1);
        apiAccess3.setResult(IndexerAccessResult.SUCCESSFUL); //Counted as successful
        apiAccessRepository.save(apiAccess3);

        //Initially ignored by set time period
        IndexerApiAccessEntity apiAccess4 = new IndexerApiAccessEntity(indexer1);
        apiAccess4.setResult(IndexerAccessResult.SUCCESSFUL); //Counted as successful
        apiAccess4.setTime(Instant.now().minus(14, ChronoUnit.DAYS));
        apiAccessRepository.save(apiAccess4);

        List<IndexerApiAccessStatsEntry> result = stats.indexerApiAccesses(new StatsRequest(Instant.now().minus(10, ChronoUnit.DAYS), Instant.now().plus(10, ChronoUnit.DAYS), false));
        assertThat(result).hasSize(1);
        //One yesterday, two today: 1.5 on average
        assertThat(result.get(0).getAverageAccessesPerDay()).isCloseTo(1.5D, within(0D));
        //One with connection error, one with another error, one successful
        assertThat(result.get(0).getPercentSuccessful()).isCloseTo(33D, within(1D));

        result = stats.indexerApiAccesses(new StatsRequest(Instant.now().minus(20, ChronoUnit.DAYS), Instant.now().plus(10, ChronoUnit.DAYS), false));
        assertThat(result).hasSize(1);
        //One yesterday, two today, one 14 days ago: 4/3=1.33 on average
        assertThat(result.get(0).getAverageAccessesPerDay()).isCloseTo(1.33D, within(0.01D));
        //One with connection error, one with another error, two successful
        assertThat(result.get(0).getPercentSuccessful()).isCloseTo(50D, within(0D));

        //Now include diabled
        result = stats.indexerApiAccesses(new StatsRequest(Instant.now().minus(10, ChronoUnit.DAYS), Instant.now().plus(10, ChronoUnit.DAYS), true));
        assertThat(result).hasSize(2);
    }



}
