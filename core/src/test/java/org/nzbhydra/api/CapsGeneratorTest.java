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

package org.nzbhydra.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.category.CategoriesConfig;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlCategories;

import java.util.Arrays;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.LENIENT)
public class CapsGeneratorTest {

    @Mock
    private ConfigProvider configProviderMock;

    @InjectMocks
    private CapsGenerator testee = new CapsGenerator();

    @BeforeEach
    public void setUp() {

        BaseConfig baseConfig = new BaseConfig();

        CategoriesConfig categoriesConfig = new CategoriesConfig();
        baseConfig.setCategoriesConfig(categoriesConfig);

        Category misc = new Category("Misc");
        misc.getNewznabCategories().add(Arrays.asList(1000));
        categoriesConfig.getCategories().add(misc);

        Category movies = new Category("Movies");
        movies.getNewznabCategories().add(Arrays.asList(2000));
        categoriesConfig.getCategories().add(movies);

        Category moviesHd = new Category("Movies HD");
        moviesHd.getNewznabCategories().add(Arrays.asList(2040));
        moviesHd.getNewznabCategories().add(Arrays.asList(2050));
        moviesHd.getNewznabCategories().add(Arrays.asList(10100));
        categoriesConfig.getCategories().add(moviesHd);

        Category musc = new Category("Musc");
        musc.getNewznabCategories().add(Arrays.asList(7050));
        categoriesConfig.getCategories().add(musc);

        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
    }

    @Test
    void shouldGenerateCategoriesFromConfig() throws Exception {
        CapsXmlCategories xmlCategories = testee.getCapsXmlCategories();

        assertThat(xmlCategories.getCategories().size()).isEqualTo(3);
        assertThat(xmlCategories.getCategories().get(0).getName()).isEqualTo("Misc");

        assertThat(xmlCategories.getCategories().get(1).getName()).isEqualTo("Movies");
        assertThat(xmlCategories.getCategories().get(1).getSubCategories().size()).isEqualTo(1);
        assertThat(xmlCategories.getCategories().get(1).getSubCategories().get(0).getName()).isEqualTo("Movies HD");

        assertThat(xmlCategories.getCategories().get(2).getName()).isEqualTo("Musc");
    }

}