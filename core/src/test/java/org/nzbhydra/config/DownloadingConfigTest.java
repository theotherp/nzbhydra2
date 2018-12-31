package org.nzbhydra.config;

import org.junit.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.config.ValidatingConfig.ConfigValidationResult;
import org.nzbhydra.config.downloading.DownloadingConfig;

import java.io.File;
import java.io.PrintWriter;

import static org.hamcrest.CoreMatchers.containsString;
import static org.hamcrest.core.Is.is;
import static org.junit.Assert.assertThat;

public class DownloadingConfigTest {

    @InjectMocks
    private DownloadingConfig testee = new DownloadingConfig();

    @Test
    public void shouldValidateTorrentsFolder() throws Exception {
        BaseConfig baseConfig = new BaseConfig();
        testee.setSaveTorrentsTo("relative");
        new File("relative").deleteOnExit();

        ConfigValidationResult result = testee.validateConfig(baseConfig, testee);
        assertThat(result.getErrorMessages().size(), is(1));
        assertThat(result.getErrorMessages().get(0), containsString("not absolute"));

        File afile = new File("afile.txt");
        afile.deleteOnExit();
        PrintWriter out = new PrintWriter("afile.txt");
        out.write("out");
        testee.setSaveTorrentsTo(afile.getAbsolutePath());
        result = testee.validateConfig(baseConfig, testee);
        assertThat(result.getErrorMessages().size(), is(1));
        assertThat(result.getErrorMessages().get(0), containsString("is a file"));

        File folder = new File("");
        testee.setSaveTorrentsTo(folder.getAbsolutePath());
        result = testee.validateConfig(baseConfig, testee);
        assertThat(result.getErrorMessages().size(), is(0));
        afile.delete();


    }

}