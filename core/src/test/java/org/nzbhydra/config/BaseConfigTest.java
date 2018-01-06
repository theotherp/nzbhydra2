package org.nzbhydra.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.google.common.collect.Sets;
import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.MockitoAnnotations;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map.Entry;
import java.util.Set;
import java.util.stream.Collectors;

import static junit.framework.TestCase.fail;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class BaseConfigTest {

    //If true the actual content of the config in code and in application.yml will be compared
    //If false only the structure will be compare, meaning both sides have to have the same keys but the values can be different
    private static final boolean COMPARE_CONFIG_VALUES = false;
    private Set<String> dontCheckTheseLists = Sets.newHashSet("categories");

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
    }

    @InjectMocks
    private BaseConfig testee = new BaseConfig();

    @Test
    public void shouldBuildCorrectBaseUrl() {
        testee.getMain().setSsl(false);
        testee.getMain().setHost("0.0.0.0");
        testee.getMain().setPort(1234);
        testee.getMain().setUrlBase("/");

        assertEquals("http://127.0.0.1:1234", testee.getBaseUrl());

        testee.getMain().setUrlBase("/nzbhydra");
        assertEquals("http://127.0.0.1:1234/nzbhydra", testee.getBaseUrl());
    }

    @Test
    public void shouldRecognizeRestartRequired() {
        MainConfig mainConfig1 = new MainConfig();
        mainConfig1.setPort(123);
        MainConfig mainConfig2 = new MainConfig();
        mainConfig2.setPort(234);
        assertTrue(mainConfig1.isRestartNeeded(mainConfig2));

        mainConfig2.setPort(123);
        assertFalse(mainConfig1.isRestartNeeded(mainConfig2));

        mainConfig1.setSsl(true);
        mainConfig2.setSsl(false);
        assertTrue(mainConfig1.isRestartNeeded(mainConfig2));
    }

    @Test
    public void applicationPropertiesShouldHaveTheSameKeysAsConfigClasses() throws Exception {
        ObjectMapper jsonMapper = new ObjectMapper();
        jsonMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true);

        jsonMapper.registerModule(new Jdk8Module());
        String jsonFromBaseConfig = jsonMapper.writeValueAsString(new BaseConfig());

        ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
        yamlMapper.registerModule(new Jdk8Module());
        BufferedReader reader = new BufferedReader(new InputStreamReader(BaseConfig.class.getResource("/config/application.yml").openStream()));
        String applicationYmlContent = reader.lines().collect(Collectors.joining("\n"));
        BaseConfig fromApplicationYml = yamlMapper.readValue(applicationYmlContent, BaseConfig.class);
        String jsonFromApplicationProperties = jsonMapper.writeValueAsString(fromApplicationYml);

        if (COMPARE_CONFIG_VALUES) {
            assertEquals("JSON generated from application.yml and base config should be the same", jsonFromApplicationProperties, jsonFromBaseConfig);
        }

        TypeReference<HashMap<String, Object>> typeRef = new TypeReference<HashMap<String, Object>>() {
        };
        HashMap<String, Object> mapFromApplicationYml = yamlMapper.readValue(applicationYmlContent, typeRef);
        HashMap<String, Object> mapFromBaseConfig = jsonMapper.readValue(jsonFromBaseConfig, typeRef);

        compare(mapFromApplicationYml, mapFromBaseConfig);
    }

    @Test
    public void bla() throws Exception{
        System.out.println(BaseConfig.getLocalHostLANAddress().getHostAddress());
    }

    private void compare(Object left, Object right) {
        if (left instanceof HashMap) {
            compareMaps((HashMap) left, (HashMap) right);
        } else if (left instanceof List) {
            compareLists((List) left, (List) right);
        } else {
            assertEquals("Setting in application.yml is different than in base config", left, left);
        }
    }

    private void compareMaps(HashMap<String, Object> left, HashMap<String, Object> right) {
        for (Entry<String, Object> entry : left.entrySet()) {
            assertTrue(entry.getValue() + " is contained in application.yml but not in base config", right.containsKey(entry.getKey()));
            if (entry.getValue() instanceof LinkedHashMap) {
                compareMaps((HashMap) entry.getValue(), (HashMap) right.get(entry.getKey()));
            } else if (entry.getValue() instanceof List) {
                if (!dontCheckTheseLists.contains(entry.getKey())) {
                    compareLists((List) entry.getValue(), (List) right.get(entry.getKey()));
                }
            } else if (COMPARE_CONFIG_VALUES) {
                assertEquals("Setting " + entry.getKey() + " in application.yml is different than in base config", entry.getValue(), right.get(entry.getKey()));
            }
        }
        Set<String> rightKeys = right.keySet();
        rightKeys.removeAll(left.keySet());
        if (!rightKeys.isEmpty()) {
            fail("Some keys in base config are not contained in the application.yml: " + rightKeys);
        }
    }


    private void compareLists(List left, List right) {
        if (right == null || left.contains(".mp4") || left.contains("nzbgeek.info")) { //Don't compare the list for trailing stuff to be removed, it's just too much stuff in there
            return;
        }
        if (left.size() != right.size()) {
            List newLeft = new ArrayList(left);
            newLeft.removeAll(right);
            if (!newLeft.isEmpty()) {
                fail("Different lists. Found in left but not right: " + newLeft);
            }
            List newRight = new ArrayList(right);
            newRight.removeAll(left);
            if (!newRight.isEmpty()) {
                fail("Different lists. Found in right but not left: " + newRight);
            }
        }
        assertEquals("Both should contain the same amount of config entries", left.size(), right.size());
        if (COMPARE_CONFIG_VALUES) {
            for (int i = 0; i < left.size(); i++) {
                Object l = left.get(i);
                assertEquals(l.getClass(), right.getClass());
                if (l instanceof Category) {
                    assertTrue("Both categories should be the same", ((Category) l).deepEquals((Category) right.get(i)));
                } else {
                    assertEquals("Setting in application.yml is different than in base config", l, right.get(i));
                }
            }
        }
    }

}