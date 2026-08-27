/*
 *  (C) Copyright 2026 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.config.category;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * FM-113. The sort in {@link CategoriesConfig#setCategories(java.util.List)} runs on every
 * deserialization, so a nameless category used to throw inside Jackson's binding -- before any
 * validator could refuse it. These cases go through the mapper on purpose: building the list with
 * {@code getCategories().add(...)} never calls the setter and so never sees the defect.
 */
class CategoriesConfigJacksonTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void shouldDeserializeACategoryWithoutAName() {
        // A named sibling on purpose: TimSort never invokes the comparator on a one-element list,
        // so a payload holding only the nameless entry passes even against the unfixed sort and
        // would certify nothing.
        String json = "{\"categories\":[{\"name\":\"TV\"},{\"name\":null}]}";

        assertThatCode(() -> objectMapper.readValue(json, CategoriesConfig.class)).doesNotThrowAnyException();

        CategoriesConfig deserialized = objectMapper.readValue(json, CategoriesConfig.class);
        assertThat(deserialized.getCategories()).hasSize(2);
        assertThat(deserialized.getCategories()).extracting(Category::getName).containsExactly("TV", null);
    }

    @Test
    void shouldSortNamelessCategoriesLastKeepingTheirRelativeOrder() {
        // Two nameless entries, so the assertion pins *where* they land rather than merely that
        // sorting survived them, and pins that they keep the order they arrived in.
        String json = "{\"categories\":["
            + "{\"name\":\"TV\",\"description\":\"named\"},"
            + "{\"name\":null,\"description\":\"first nameless\"},"
            + "{\"name\":\"Movies\",\"description\":\"named\"},"
            + "{\"name\":null,\"description\":\"second nameless\"}"
            + "]}";

        CategoriesConfig deserialized = objectMapper.readValue(json, CategoriesConfig.class);

        assertThat(deserialized.getCategories()).extracting(Category::getName)
            .containsExactly("Movies", "TV", null, null);
        assertThat(deserialized.getCategories()).extracting(Category::getDescription)
            .containsExactly("named", "named", "first nameless", "second nameless");
    }

    @Test
    void shouldKeepTodaysOrderWhenEveryCategoryHasAName() {
        String json = "{\"categories\":[{\"name\":\"TV\"},{\"name\":\"Anime\"},{\"name\":\"Movies\"}]}";

        CategoriesConfig deserialized = objectMapper.readValue(json, CategoriesConfig.class);

        assertThat(deserialized.getCategories()).extracting(Category::getName)
            .containsExactly("Anime", "Movies", "TV");
    }

    @Test
    void shouldRoundTripNamelessCategoriesByteStably() {
        // The write path re-enters the setter through ConfigReaderWriter.save's convertValue, so an
        // unstable order for nameless entries would churn nzbhydra.yml on every save.
        String json = "{\"categories\":["
            + "{\"name\":null,\"description\":\"first nameless\"},"
            + "{\"name\":\"TV\"},"
            + "{\"name\":null,\"description\":\"second nameless\"}"
            + "]}";

        String once = objectMapper.writeValueAsString(objectMapper.readValue(json, CategoriesConfig.class));
        String twice = objectMapper.writeValueAsString(objectMapper.readValue(once, CategoriesConfig.class));

        assertThat(twice).isEqualTo(once);
    }
}
