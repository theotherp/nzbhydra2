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

package org.nzbhydra.tests.searching;

import org.junit.Test;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;

import javax.xml.bind.JAXBContext;
import javax.xml.bind.Unmarshaller;
import java.net.URL;

import static org.assertj.core.api.Assertions.assertThat;

public class SearchingSystemTest {


    private JAXBContext jaxbContext;
    private Unmarshaller jaxbUnmarshaller;

    public SearchingSystemTest() throws Exception {
        jaxbContext = JAXBContext.newInstance(NewznabXmlRoot.class);
        jaxbUnmarshaller = jaxbContext.createUnmarshaller();
    }

    @Test
    public void testPaging() throws Exception {
        //mock 1 and mock 100 configured
        NewznabXmlRoot page1 = (NewznabXmlRoot) jaxbUnmarshaller.unmarshal(new URL("http://127.0.0.1:5076/api?t=search&q=paging&offset=0&apikey=apikey"));
        assertThat(page1.getRssChannel().getItems()).extracting(NewznabXmlItem::getTitle).contains("indexer1");
        NewznabXmlItem page1item1 = page1.getRssChannel().getItems().get(0);
        NewznabXmlItem page1item100 = page1.getRssChannel().getItems().get(99);

        NewznabXmlRoot page2 = (NewznabXmlRoot) jaxbUnmarshaller.unmarshal(new URL("http://127.0.0.1:5076/api?t=search&q=paging&offset=100&apikey=apikey"));
        assertThat(page2.getRssChannel().getItems()).extracting(NewznabXmlItem::getTitle).contains("indexer1-2");
        NewznabXmlItem page2item1 = page2.getRssChannel().getItems().get(0);
        NewznabXmlItem page2item100 = page2.getRssChannel().getItems().get(99);

        NewznabXmlRoot page3 = (NewznabXmlRoot) jaxbUnmarshaller.unmarshal(new URL("http://127.0.0.1:5076/api?t=search&q=paging&offset=200&apikey=apikey"));
        assertThat(page3.getRssChannel().getItems()).extracting(NewznabXmlItem::getTitle).contains("indexer1-3");
        NewznabXmlItem page3item1 = page3.getRssChannel().getItems().get(0);
        NewznabXmlItem page3item100 = page3.getRssChannel().getItems().get(99);

        assertThat(page1item1.getPubDate()).isAfter(page1item100.getPubDate());
        assertThat(page1item100.getPubDate()).isAfter(page2item1.getPubDate());

        assertThat(page2item1.getPubDate()).isAfter(page2item100.getPubDate());
        assertThat(page2item100.getPubDate()).isAfter(page3item1.getPubDate());

        assertThat(page3item1.getPubDate()).isAfter(page3item100.getPubDate());
    }
}
