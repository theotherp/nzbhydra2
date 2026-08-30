

package org.nzbhydra;

import org.apache.commons.lang3.RandomStringUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

@SystemTest
public class GenericStorageTest {

    private static final String ENDPOINT = "/internalapi/genericstorage/";
    @Autowired
    private HydraClient hydraClient;

    @Test
    public void shouldPutAndGet() {
        final String key = RandomStringUtils.randomAlphabetic(10);
        assertThat(hydraClient.get(ENDPOINT + key).body()).isEqualTo("");
        hydraClient.put(ENDPOINT + key, "aBody");
        assertThat(hydraClient.get(ENDPOINT + key).body()).isEqualTo("aBody");
    }


}
