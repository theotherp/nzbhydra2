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

package org.nzbhydra.searching;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultWebTO;
import org.nzbhydra.searching.dtoseventsenums.SearchResultWebTO.SearchResultWebTOBuilder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

public class InternalSearchResultProcessorTest {

    @InjectMocks
    private InternalSearchResultProcessor testee = new InternalSearchResultProcessor();


    @Test
    void setSearchResultDateRelatedValues() {

        SearchResultWebTOBuilder builder = SearchResultWebTO.builder();
        SearchResultItem item = new SearchResultItem();
        item.setPubDate(Instant.now().minus(100, ChronoUnit.DAYS)); //Should be ignored when usenet date is set

        item.setUsenetDate(Instant.now().minus(10, ChronoUnit.DAYS));
        builder = testee.setSearchResultDateRelatedValues(builder, item);
        assertThat(builder.build().getAge()).isEqualTo("10d");

        item.setUsenetDate(Instant.now().minus(10, ChronoUnit.HOURS));
        builder = testee.setSearchResultDateRelatedValues(builder, item);
        assertThat(builder.build().getAge()).isEqualTo("10h");

        item.setUsenetDate(Instant.now().minus(10, ChronoUnit.MINUTES));
        builder = testee.setSearchResultDateRelatedValues(builder, item);
        assertThat(builder.build().getAge()).isEqualTo("10m");

        item.setUsenetDate(null);
        builder = testee.setSearchResultDateRelatedValues(builder, item);
        assertThat(builder.build().getAge()).isEqualTo("100d");
    }
}