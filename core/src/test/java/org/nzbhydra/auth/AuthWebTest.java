package org.nzbhydra.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.web.BootstrappedDataTO;

import java.security.Principal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthWebTest {

    @Mock
    private UserInfosProvider userInfos;
    @Mock
    private HttpSession session;
    @Mock
    private Principal principal;
    @Mock
    private HttpServletRequest request;
    @InjectMocks
    private AuthWeb testee;

    @Test
    void shouldReturnCompleteBootstrapDataForCurrentSession() {
        BootstrappedDataTO bootstrapData = new BootstrappedDataTO();
        bootstrapData.setBaseUrl("/hydra/");
        when(request.getContextPath()).thenReturn("/hydra");
        when(userInfos.getBootstrapData(principal, "/hydra")).thenReturn(bootstrapData);

        assertThat(testee.userinfos(session, principal, request)).isSameAs(bootstrapData);

        verify(userInfos).getBootstrapData(principal, "/hydra");
    }
}
