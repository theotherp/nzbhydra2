

package org.nzbhydra.notifications;

import org.junit.jupiter.api.Test;
import org.nzbhydra.Jackson;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

public class NotificationEntityTest {
    private final NotificationEntity testee = new NotificationEntity();

    @Test
    public void shouldBeConvertibleToTO() throws Exception {
        testee.setTime(Instant.now());
        testee.setBody("body");
        testee.setId(1);
        testee.setUrls("urls");
        testee.setMessageType(NotificationMessageType.INFO);
        testee.setDisplayed(true);
        testee.setTitle("title");


        final NotificationEntityTO to = Jackson.JSON_MAPPER.convertValue(testee, NotificationEntityTO.class);
        final String jsonTO = Jackson.JSON_MAPPER.writeValueAsString(to);
        final String jsonEntity = Jackson.JSON_MAPPER.writeValueAsString(testee);
        assertThat(jsonTO).isEqualTo(jsonEntity);
    }

}
