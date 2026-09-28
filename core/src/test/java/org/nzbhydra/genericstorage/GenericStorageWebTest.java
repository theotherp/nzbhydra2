package org.nzbhydra.genericstorage;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GenericStorageWebTest {

    @Mock
    private GenericStorage genericStorage;
    @Mock
    private HttpServletRequest request;
    @InjectMocks
    private GenericStorageWeb testee;

    @Test
    void shouldRefuseAccessToUserPreferences() {
        assertThatThrownBy(() -> testee.put("userPreferences-alice", false, "{}", request))
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
        assertThatThrownBy(() -> testee.get("userPreferences", true, request))
                .isInstanceOf(ResponseStatusException.class);
        verify(genericStorage, never()).save(anyString(), any());
    }

    @Test
    void shouldStoreOtherKeysPerUser() {
        when(request.getRemoteUser()).thenReturn("alice");

        testee.put("themePreference", true, "bright", request);

        verify(genericStorage).save("themePreference-alice", "bright");
    }
}
