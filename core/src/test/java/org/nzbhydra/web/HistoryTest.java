package org.nzbhydra.web;

import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.web.mapping.FilterDefinition;
import org.nzbhydra.web.mapping.FilterModel;
import org.nzbhydra.web.mapping.SortModel;
import org.nzbhydra.web.mapping.stats.HistoryRequestData;

import java.time.Instant;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

@Ignore //TODO Still needed?
public class HistoryTest {
    @InjectMocks
    private History testee = new History();

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
    }

    @Test
    public void shouldBuildQuery() {

        HistoryRequestData searchRequest = new HistoryRequestData();
        FilterModel filterModel = new FilterModel();
        filterModel.put("title", new FilterDefinition("containThis", "freetext", false));
        filterModel.put("types", new FilterDefinition(Arrays.asList("1", "a"), "checkboxes", false));
        filterModel.put("bool1", new FilterDefinition(true, "boolean", false));
        filterModel.put("bool2", new FilterDefinition(false, "boolean", false));

        Map<String, String> times = new HashMap<>();
        times.put("before", Instant.now().toString());
        filterModel.put("time1", new FilterDefinition(times, "time", false));

        searchRequest.setFilterModel(filterModel);
        searchRequest.setSortModel(new SortModel("sortByThis", 1));

        testee.searchHistory(searchRequest);
    }


}