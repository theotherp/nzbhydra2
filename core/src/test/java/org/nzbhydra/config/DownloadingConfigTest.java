package org.nzbhydra.config;

import org.junit.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.config.ValidatingConfig.ConfigValidationResult;

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
        baseConfig.getDownloading().setSaveTorrentsTo("relative");

        ConfigValidationResult result = testee.validateConfig(baseConfig);
        assertThat(result.getErrorMessages().size(), is(1));
        assertThat(result.getErrorMessages().get(0), containsString("not absolute"));

        File file = new File("afile.txt");
        file.deleteOnExit();
        PrintWriter out = new PrintWriter("afile.txt");
        out.write("out");
        baseConfig.getDownloading().setSaveTorrentsTo(file.getAbsolutePath());
        result = testee.validateConfig(baseConfig);
        assertThat(result.getErrorMessages().size(), is(1));
        assertThat(result.getErrorMessages().get(0), containsString("is a file"));

        File folder = new File("");
        baseConfig.getDownloading().setSaveTorrentsTo(folder.getAbsolutePath());
        result = testee.validateConfig(baseConfig);
        assertThat(result.getErrorMessages().size(), is(0));
        file.delete();

    }

}