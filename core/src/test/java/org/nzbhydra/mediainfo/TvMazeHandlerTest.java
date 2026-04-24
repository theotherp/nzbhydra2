package org.nzbhydra.mediainfo;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TvMazeHandlerTest {

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private TvMazeHandler testee;

    @SuppressWarnings("unchecked")
    private static ParameterizedTypeReference<Object> anyParameterizedTypeReference() {
        return any(ParameterizedTypeReference.class);
    }

    @Test
    void shouldReturnEmptyListWhenTitleSearchFindsNoShows() throws Exception {
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), isNull(), anyParameterizedTypeReference()))
                .thenReturn(new ResponseEntity<>(Collections.emptyList(), HttpStatus.OK));

        assertThat(testee.search("EXAMPLE.S02E04.")).isEmpty();
    }

    @Test
    void shouldThrowInfoNotFoundExceptionWhenConvertingByTitleAndNoShowIsFound() {
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), isNull(), anyParameterizedTypeReference()))
                .thenReturn(new ResponseEntity<>(Collections.emptyList(), HttpStatus.OK));

        assertThatThrownBy(() -> testee.getInfos("EXAMPLE.S02E04.", MediaIdType.TVTITLE))
                .isInstanceOf(InfoNotFoundException.class)
                .hasMessageContaining("EXAMPLE.S02E04.");
    }
}
