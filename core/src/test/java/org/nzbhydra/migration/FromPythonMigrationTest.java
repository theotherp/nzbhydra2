package org.nzbhydra.migration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.backup.BackupAndRestore;
import org.nzbhydra.migration.FromPythonMigration.MigrationResult;
import org.nzbhydra.migration.FromPythonMigration.OkHttpResponse;
import org.nzbhydra.migration.JsonConfigMigration.ConfigMigrationResult;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.core.Is.is;
import static org.hamcrest.core.IsNull.nullValue;
import static org.junit.Assert.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;


public class FromPythonMigrationTest {

    String oldVersion = "{\"currentVersion\":\"0.2.100\"}";
    String newVersion = "{\"currentVersion\":\"1.0.0\"}";
    String configBody = "{\"config\":\"{}\"";

    @Mock
    private JsonConfigMigration configMigration;
    @Mock
    private SqliteMigration sqliteMigration;
    @Mock
    private ConfigMigrationResult configMigrationResult;
    @Mock
    private BackupAndRestore backupAndRestore;

    @InjectMocks
    private FromPythonMigration testee = new FromPythonMigration();

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        testee = spy(testee);
        Map<String, Object> config = new HashMap<>();
        config.put("config", "bla");
        configBody = new ObjectMapper().writeValueAsString(config);
    }

    @Test
    public void shouldCatchUnsuccessfulConnection() throws Exception {
        doReturn(new OkHttpResponse("", false, "message")).when(testee).callHydraUrl(anyString(), anyString());

        MigrationResult result = testee.migrateFromUrl("xyz", true, false);

        assertThat(result.isRequirementsMet(), is(false));
        assertThat(result.getError(), is("Unable to connect to NZBHydra 1: message"));
        assertThat(result.isDatabaseMigrated(), is(false));
        assertThat(result.isConfigMigrated(), is(false));
        assertThat(result.getWarningMessages().size(), is(0));
    }

    @Test
    public void shouldCatchWrongVersion() throws Exception {
        doReturn(new OkHttpResponse(oldVersion, true, "message")).when(testee).callHydraUrl(anyString(), eq("get_versions"));

        MigrationResult result = testee.migrateFromUrl("xyz", true, false);

        assertThat(result.isRequirementsMet(), is(false));
        assertThat(result.getError(), is("Unable to migrate from NZBHydra 1 version 0.2.100. Must be at least 0.2.220"));
        assertThat(result.isDatabaseMigrated(), is(false));
        assertThat(result.isConfigMigrated(), is(false));
        assertThat(result.getWarningMessages().size(), is(0));
    }


    @Test
    public void shouldReturnConfigMigrationMessagesWhenDatabaseSuccessful() throws Exception {
        doReturn(new OkHttpResponse(newVersion, true, "message")).when(testee).callHydraUrl(anyString(), eq("get_versions"));
        doReturn(new OkHttpResponse(configBody, true, "message")).when(testee).callHydraUrl(anyString(), eq("migration"));
        when(configMigration.migrate(anyString())).thenReturn(configMigrationResult);
        when(configMigrationResult.getMessages()).thenReturn(Arrays.asList("aWarningMessage"));

        MigrationResult result = testee.migrateFromUrl("xyz", true, false);

        assertThat(result.isRequirementsMet(), is(true));
        assertThat(result.isConfigMigrated(), is(true));
        assertThat(result.isDatabaseMigrated(), is(true));
        assertThat(result.getError(), is(nullValue()));
        assertThat(result.getWarningMessages().size(), is(1));
        assertThat(result.getWarningMessages().get(0), is("aWarningMessage"));
    }


}