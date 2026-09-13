package org.nzbhydra.news;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.auth.UserInfosProvider;
import org.nzbhydra.update.UpdateManager;
import org.nzbhydra.web.BootstrappedDataTO;

import java.security.Principal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NewsWebTest {

    @Mock
    private NewsProvider newsProviderMock;
    @Mock
    private UpdateManager updateManagerMock;
    @Mock
    private UserNewsProvider userNewsProviderMock;
    @Mock
    private UserInfosProvider userInfosProviderMock;

    @InjectMocks
    private NewsWeb testee = new NewsWeb();

    @Test
    void shouldPassAdminFlagFromUserInfosProviderForPrincipal() {
        Principal principal = mock(Principal.class);
        when(principal.getName()).thenReturn("someuser");
        BootstrappedDataTO bootstrappedData = new BootstrappedDataTO();
        bootstrappedData.setMaySeeAdmin(false);
        when(userInfosProviderMock.getUserInfos(eq(principal))).thenReturn(bootstrappedData);

        testee.getUnreadUserNews(principal);

        verify(userNewsProviderMock).getUnreadUserNewsForUser("someuser", false);
    }

    @Test
    void shouldPassAdminFlagForAdminPrincipal() {
        Principal principal = mock(Principal.class);
        when(principal.getName()).thenReturn("adminuser");
        BootstrappedDataTO bootstrappedData = new BootstrappedDataTO();
        bootstrappedData.setMaySeeAdmin(true);
        when(userInfosProviderMock.getUserInfos(eq(principal))).thenReturn(bootstrappedData);

        testee.getUnreadUserNews(principal);

        verify(userNewsProviderMock).getUnreadUserNewsForUser("adminuser", true);
    }

    @Test
    void shouldTreatNullPrincipalAsAnonymousAndUseUserInfosAdminFlag() {
        BootstrappedDataTO bootstrappedData = new BootstrappedDataTO();
        bootstrappedData.setMaySeeAdmin(true);
        when(userInfosProviderMock.getUserInfos(null)).thenReturn(bootstrappedData);

        testee.getUnreadUserNews(null);

        verify(userNewsProviderMock).getUnreadUserNewsForUser("anonymous", true);
    }

    @Test
    void shouldRenderMarkdownBodyAsHtml() {
        BootstrappedDataTO bootstrappedData = new BootstrappedDataTO();
        bootstrappedData.setMaySeeAdmin(true);
        when(userInfosProviderMock.getUserInfos(null)).thenReturn(bootstrappedData);
        when(userNewsProviderMock.getUnreadUserNewsForUser("anonymous", true))
                .thenReturn(List.of(new UserNewsEntry("id1", "Title", "**bold**", true)));

        List<UserNewsEntryForWeb> result = testee.getUnreadUserNews(null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("id1");
        assertThat(result.get(0).getTitle()).isEqualTo("Title");
        assertThat(result.get(0).getNewsAsHtml()).contains("<strong>bold</strong>");
    }
}
