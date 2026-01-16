

package org.nzbhydra;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.assertj.core.api.Assertions;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class TestDownloader {

    @Autowired
    private HydraClient hydraClient;

    public NewznabXmlItem searchSomethingAndTriggerDownload(String query) throws Exception {
        final HydraResponse response = hydraClient.get("/api", "apikey=apikey", "t=search", "q=" + query);
        final String body = response.body();
        NewznabXmlRoot root = Jackson.getUnmarshal(body);
        Assertions.assertThat(root).isNotNull();
        Assertions.assertThat(root.getRssChannel().getItems()).isNotEmpty();
        final NewznabXmlItem firstItem = root.getRssChannel().getItems().get(0);
        final String link = firstItem.getLink();
        try (Response downloadResponse = new OkHttpClient().newCall(new Request.Builder().url(link).build()).execute()) {
            final ResponseBody downloadBody = downloadResponse.body();
            Assertions.assertThat(downloadBody.string()).contains("Would download NZB");
        }
        return firstItem;
    }
}
