

package org.nzbhydra.problemdetection;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.logging.LogContentProvider;

import java.io.Serializable;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
public class OutOfMemoryDetectorTest {

    @Mock
    private LogContentProvider logContentProviderMock;
    @Mock
    private GenericStorage genericStorageMock;
    @Captor
    private ArgumentCaptor<String> stringArgumentCaptor;
    @Captor
    private ArgumentCaptor<Serializable> objectArgumentCaptor;

    @InjectMocks
    private OutOfMemoryDetector testee = new OutOfMemoryDetector();


    @Disabled //Fails on Pipeline
    @Test
    void executeCheck() throws Exception {


        final Path tempFile = Files.createTempFile("nzbhydra", ".log");
        try {
            tempFile.toFile().delete();
            Files.copy(getClass().getResourceAsStream("logWithOom.log"), tempFile);
        } catch (Exception e) {
            //May happen on pipeline
            return;
        }

        when(logContentProviderMock.getCurrentLogfile(false)).thenReturn(tempFile.toFile());

        testee.executeCheck();

        verify(genericStorageMock, times(4)).save(stringArgumentCaptor.capture(), objectArgumentCaptor.capture());

        assertThat(stringArgumentCaptor.getAllValues().get(0)).isEqualTo("outOfMemoryDetected-2018-11-09 00:17:46 database: close");
        assertThat(stringArgumentCaptor.getAllValues().get(1)).isEqualTo("outOfMemoryDetected");
        assertThat(stringArgumentCaptor.getAllValues().get(2)).isEqualTo("outOfMemoryDetected-2018-11-09 11:11:46 database: close");
        assertThat(stringArgumentCaptor.getAllValues().get(3)).isEqualTo("outOfMemoryDetected");

        assertThat(objectArgumentCaptor.getAllValues().get(0)).isEqualTo(true);
        assertThat(objectArgumentCaptor.getAllValues().get(1)).isEqualTo(true);
    }
}