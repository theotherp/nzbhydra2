/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.indexers;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.mapping.newznab.xml.Xml;

import java.net.URI;

public class DevIndexerTest {

    @InjectMocks
    private DevIndexer testee = new DevIndexer(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);

    @Test
    void testGeneration() throws Exception {
        Xml xml = testee.getAndStoreResultToDatabase(URI.create("http://127.0.01/duplicatesandtitlegroups"), null);
        NewznabXmlRoot root = (NewznabXmlRoot) xml;
        System.out.println(root);
    }


}
