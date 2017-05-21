package org.nzbhydra.migration;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Request.Builder;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;

@Component
public class FromPythonMigration {

    @Autowired
    private JsonConfigMigration configMigration;
    @Autowired
    private SqliteMigration sqliteMigration;
    protected TypeReference<Map<String, String>> mapTypeReference = new TypeReference<Map<String, String>>() {
    };

    public void migrate(String nzbhydra1BaseUrl) throws IOException, SQLException {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(nzbhydra1BaseUrl);
        builder.pathSegment("internalapi", "migration").toUriString();
        String url = builder.toUriString();
        OkHttpClient client = new OkHttpClient.Builder().build();
        Request request = new Builder().url(url).build();
        Response execute = client.newCall(request).execute();
        Map<String, String> migrationData = new ObjectMapper().readValue(execute.body().string(), mapTypeReference);

        configMigration.migrate(migrationData.get("config"));
        sqliteMigration.migrate(migrationData.get("databaseFile"));
    }

}
