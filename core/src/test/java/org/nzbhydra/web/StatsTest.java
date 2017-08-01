package org.nzbhydra.web;

import org.junit.Before;
import org.mockito.InjectMocks;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.historystats.StatsWeb;

public class StatsTest {
    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
    }

    @InjectMocks
    private StatsWeb testee = new StatsWeb();


}