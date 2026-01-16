

package org.nzbhydra.downloading;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

public class NzbDownloadEntityTest {


    @Test
    void shouldTruncatLongError() {
        FileDownloadEntity testee = new FileDownloadEntity();
        StringBuilder builder = new StringBuilder();
        for (int i = 1; i <= 799; i++) {
            builder.append("12345");
        }
        builder.append("abcdef");
        assertThat(builder.length()).isEqualTo(4001);
        testee.setError(builder.toString());
        assertThat(testee.getError()).endsWith("abcde");
    }


}