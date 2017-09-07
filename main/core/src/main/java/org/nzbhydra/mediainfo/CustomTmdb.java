package org.nzbhydra.mediainfo;

import com.uwetrottmann.tmdb2.Tmdb;
import okhttp3.OkHttpClient;
import okhttp3.OkHttpClient.Builder;
import org.nzbhydra.okhttp.HydraOkHttp3ClientHttpRequestFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.net.URI;
import java.net.URISyntaxException;

@Component
public class CustomTmdb extends Tmdb {

    @Value("${nzbhydra.tmdb.apikey:}")
    protected String tmdbApiKey;
    protected OkHttpClient client;

    @Autowired
    private HydraOkHttp3ClientHttpRequestFactory requestFactory;

    public CustomTmdb() {
        super(null);
    }

    @PostConstruct
    private void initWithApiKey() {
        this.apiKey(tmdbApiKey);
    }


    @Override
    protected synchronized OkHttpClient okHttpClient() {
        if (client == null) {
            try {
                Builder builder = requestFactory.getOkHttpClientBuilder(new URI(Tmdb.API_URL));
                setOkHttpClientDefaults(builder);
                client = builder.build();
            } catch (URISyntaxException e) {
                throw new RuntimeException("Shouldn't happen...", e);
            }
        }
        return client;
    }


}
