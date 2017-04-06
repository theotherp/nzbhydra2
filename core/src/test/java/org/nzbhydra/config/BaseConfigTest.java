package org.nzbhydra.config;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.MockitoAnnotations;

import static org.junit.Assert.assertEquals;

public class BaseConfigTest {
    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
    }

    @InjectMocks
    private BaseConfig testee = new BaseConfig();

    @Test
    public void shouldBuildCorrectBaseUrl() {
        testee.getMain().setSsl(false);
        testee.getMain().setHost("0.0.0.0");
        testee.getMain().setPort(1234);
        testee.getMain().setUrlBase("/");

        assertEquals("http://127.0.0.1:1234", testee.getBaseUrl());

        testee.getMain().setUrlBase("/nzbhydra");
        assertEquals("http://127.0.0.1:1234/nzbhydra", testee.getBaseUrl());
    }

}