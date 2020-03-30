/*
 *  (C) Copyright 2020 TheOtherP (theotherp@gmx.de)
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

package org.nzbhydra.indexers.capscheck;

import com.google.common.io.Resources;
import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.okhttp.WebAccess;

import java.nio.charset.Charset;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

public class JacketConfigRetrieverTest {

    @Mock
    private WebAccess webAccessMock;

    @InjectMocks
    private JacketConfigRetriever testee;

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        when(webAccessMock.callUrl(anyString())).thenReturn(Resources.toString(Resources.getResource(JacketConfigRetrieverTest.class, "jackettConfiguredIndexers.xml"), Charset.defaultCharset()));
    }

    @Test
    public void retrieveIndexers() throws Exception {
        testee.retrieveIndexers(null);
    }
}