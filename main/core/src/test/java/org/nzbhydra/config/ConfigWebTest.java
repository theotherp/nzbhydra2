package org.nzbhydra.config;

import org.junit.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.config.ConfigWeb.FileSystemEntry;

public class ConfigWebTest {
    @InjectMocks
    private ConfigWeb testee = new ConfigWeb();
    
    @Test
    public void getDirectoryListing() throws Exception {
        FileSystemEntry listing = testee.getDirectoryListing(null);
        System.out.println();
    }



}