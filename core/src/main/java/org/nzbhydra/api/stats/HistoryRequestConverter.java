

package org.nzbhydra.api.stats;

import org.nzbhydra.Jackson;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.springframework.core.convert.converter.Converter;
import tools.jackson.core.JacksonException;

public class HistoryRequestConverter implements Converter<String, HistoryRequest> {

    @Override
    public HistoryRequest convert(String source) {
        try {
            return Jackson.JSON_MAPPER.readValue(source, HistoryRequest.class);
        } catch (JacksonException e) {
            throw new RuntimeException(e);
        }
    }
}
