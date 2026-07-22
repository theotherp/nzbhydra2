

package org.nzbhydra.api.stats;

import org.nzbhydra.Jackson;
import org.nzbhydra.historystats.stats.StatsRequest;
import org.springframework.core.convert.converter.Converter;
import tools.jackson.core.JacksonException;

public class StatsRequestConverter implements Converter<String, StatsRequest> {

    @Override
    public StatsRequest convert(String source) {
        try {
            return Jackson.JSON_MAPPER.readValue(source, StatsRequest.class);
        } catch (JacksonException e) {
            throw new RuntimeException(e);
        }
    }
}
