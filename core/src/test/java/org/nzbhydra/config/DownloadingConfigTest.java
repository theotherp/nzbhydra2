package org.nzbhydra.config;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.config.ValidatingConfig.ConfigValidationResult;
import org.nzbhydra.config.downloading.DownloadingConfig;

import java.io.File;
import java.io.PrintWriter;

import static org.assertj.core.api.Assertions.assertThat;

public class DownloadingConfigTest {

    @InjectMocks
    private DownloadingConfig testee = new DownloadingConfig();

    @Test
    void shouldValidateTorrentsFolder() throws Exception {
        BaseConfig baseConfig = new BaseConfig();
        testee.setSaveTorrentsTo("relative");
        new File("relative").deleteOnExit();

        ConfigValidationResult result = testee.validateConfig(baseConfig, testee, new BaseConfig());
        assertThat(result.getErrorMessages().size()).isEqualTo(1);
        assertThat(result.getErrorMessages().get(0)).contains("not absolute");

        File afile = new File("afile.txt");
        afile.deleteOnExit();
        PrintWriter out = new PrintWriter("afile.txt");
        out.write("out");
        testee.setSaveTorrentsTo(afile.getAbsolutePath());
        result = testee.validateConfig(baseConfig, testee, new BaseConfig());
        assertThat(result.getErrorMessages().size()).isEqualTo(1);
        assertThat(result.getErrorMessages().get(0)).contains("is a file");

        File folder = new File("");
        testee.setSaveTorrentsTo(folder.getAbsolutePath());
        result = testee.validateConfig(baseConfig, testee, new BaseConfig());
        assertThat(result.getErrorMessages().size()).isEqualTo(0);
        afile.delete();


    }

}
