/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.problemdetection;

import com.google.common.io.Resources;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.logging.LogContentProvider;

import java.io.Serializable;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

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


    @Test
    public void executeCheck() throws Exception {
        MockitoAnnotations.initMocks(this);

        final Path tempFile = Files.createTempFile("nzbhydra", ".log");
        Files.write(tempFile, Resources.toByteArray(Resources.getResource(OutOfMemoryDetectorTest.class, "logWithOom.log")));

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