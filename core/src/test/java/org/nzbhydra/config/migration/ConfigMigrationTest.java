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

package org.nzbhydra.config.migration;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.MainConfig;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class ConfigMigrationTest {

    @Mock
    private ConfigMigrationStep configMigrationStepMock;

    @InjectMocks
    private ConfigMigration testee = new ConfigMigration();

    private TypeReference<HashMap<String, Object>> typeRef
            = new TypeReference<HashMap<String, Object>>() {
    };
    private ObjectMapper objectMapper = new ObjectMapper();

    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        objectMapper.registerModule(new Jdk8Module());
    }

    @Test
    public void shouldMigrate() {
        BaseConfig input = new BaseConfig();
        input.getMain().setConfigVersion(1);
        BaseConfig afterMigration = new BaseConfig();
        afterMigration.getMain().setConfigVersion(2);
        Map<String, Object> map = objectMapper.convertValue(input, typeRef);

        when(configMigrationStepMock.forVersion()).thenReturn(1);
        when(configMigrationStepMock.migrate(any())).thenReturn(map);
        testee.steps = Arrays.asList(configMigrationStepMock);
        testee.expectedConfigVersion = 2;

        Map<String, Object> result = testee.migrate(map);

        input = objectMapper.convertValue(result, BaseConfig.class);
        verify(configMigrationStepMock).migrate(map);
        assertThat(input.getMain().getConfigVersion()).isEqualTo(2);
    }

    @Test(expected = RuntimeException.class)
    public void shouldThrowExceptionIfWrongConfigVersionAfterMigration() {
        BaseConfig input = new BaseConfig();
        input.getMain().setConfigVersion(1);
        Map<String, Object> map = objectMapper.convertValue(input, typeRef);

        testee.steps = Collections.emptyList(); //Just don't call any steps, this will skip the loop, not increasing the version
        testee.expectedConfigVersion = 2;

        testee.migrate(map);
    }

    @Test
    public void shouldFindMigrationStepsForAllPossibleConfigVersions() {
        Integer currentConfigVersion = new MainConfig().getConfigVersion();
        List<ConfigMigrationStep> steps = ConfigMigration.getMigrationSteps();
        for (int i = 3; i < currentConfigVersion; i++) {
            int finalI = i;
            assertThat(steps.stream().anyMatch(x -> x.forVersion() == finalI)).isTrue();
        }

    }
}