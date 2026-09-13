package org.nzbhydra.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.OutputType;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class MockSearchTest {

    @Mock
    private NewznabXmlTransformer newznabXmlTransformer;
    @Mock
    private NewznabJsonTransformer newznabJsonTransformer;
    @Captor
    private ArgumentCaptor<List<SearchResultItem>> resultsCaptor;
    @InjectMocks
    private MockSearch testee;

    @Test
    void shouldSetDownloadIdentifiersOnMockResult() {
        NewznabParameters parameters = new NewznabParameters();
        parameters.setO(OutputType.XML);

        testee.mockSearch(parameters, true);

        verify(newznabXmlTransformer).getRssRoot(resultsCaptor.capture(), anyInt(), anyInt(), anyBoolean());
        SearchResultItem mockResult = resultsCaptor.getValue().get(0);
        assertThat(mockResult.getSearchResultId()).isZero();
        assertThat(mockResult.getSearchId()).isZero();
    }
}
