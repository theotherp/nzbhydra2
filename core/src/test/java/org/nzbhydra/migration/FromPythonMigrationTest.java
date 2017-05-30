package org.nzbhydra.migration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.migration.FromPythonMigration.MigrationResult;
import org.nzbhydra.migration.FromPythonMigration.OkHttpResponse;
import org.nzbhydra.migration.JsonConfigMigration.ConfigMigrationResult;

import java.sql.SQLException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.core.Is.is;
import static org.hamcrest.core.IsNull.nullValue;
import static org.junit.Assert.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;


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

        MigrationResult result = testee.migrate("xyz");

        assertThat(result.isRequirementsMet(), is(false));
        assertThat(result.getError(), is("Unable to connect to NZBHydra 1: message"));
        assertThat(result.isDatabaseMigrated(), is(false));
        assertThat(result.isConfigMigrated(), is(false));
        assertThat(result.getWarningMessages().size(), is(0));
    }

    @Test
    public void shouldCatchWrongVersion() throws Exception {
        doReturn(new OkHttpResponse(oldVersion, true, "message")).when(testee).callHydraUrl(anyString(), eq("get_versions"));

        MigrationResult result = testee.migrate("xyz");

        assertThat(result.isRequirementsMet(), is(false));
        assertThat(result.getError(), is("Unable to migrate from NZBHydra 1 version 0.2.100. Must be at least 0.2.219"));
        assertThat(result.isDatabaseMigrated(), is(false));
        assertThat(result.isConfigMigrated(), is(false));
        assertThat(result.getWarningMessages().size(), is(0));
    }

    @Test
    public void shouldReturnConfigMigrationMessagesWhenDatabaseFailed() throws Exception {
        doReturn(new OkHttpResponse(newVersion, true, "message")).when(testee).callHydraUrl(anyString(), eq("get_versions"));
        doReturn(new OkHttpResponse(configBody, true, "message")).when(testee).callHydraUrl(anyString(), eq("migration"));
        when(configMigration.migrate(anyString())).thenReturn(configMigrationResult);
        when(sqliteMigration.migrate(any())).thenThrow(new SQLException("sqlMessage"));
        when(configMigrationResult.getMessages()).thenReturn(Arrays.asList("aWarningMessage"));

        MigrationResult result = testee.migrate("xyz");

        assertThat(result.isRequirementsMet(), is(true));
        assertThat(result.isConfigMigrated(), is(true));
        assertThat(result.isDatabaseMigrated(), is(false));
        assertThat(result.getError(), is("Error while migrating database: sqlMessage"));
        assertThat(result.getWarningMessages().size(), is(1));
        assertThat(result.getWarningMessages().get(0), is("aWarningMessage"));
    }

    @Test
    public void shouldReturnConfigMigrationMessagesWhenDatabaseSuccessful() throws Exception {
        doReturn(new OkHttpResponse(newVersion, true, "message")).when(testee).callHydraUrl(anyString(), eq("get_versions"));
        doReturn(new OkHttpResponse(configBody, true, "message")).when(testee).callHydraUrl(anyString(), eq("migration"));
        when(configMigration.migrate(anyString())).thenReturn(configMigrationResult);
        when(configMigrationResult.getMessages()).thenReturn(Arrays.asList("aWarningMessage"));

        MigrationResult result = testee.migrate("xyz");

        assertThat(result.isRequirementsMet(), is(true));
        assertThat(result.isConfigMigrated(), is(true));
        assertThat(result.isDatabaseMigrated(), is(true));
        assertThat(result.getError(), is(nullValue()));
        assertThat(result.getWarningMessages().size(), is(1));
        assertThat(result.getWarningMessages().get(0), is("aWarningMessage"));
    }


}