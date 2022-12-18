package org.nzbhydra.mediainfo;

import com.uwetrottmann.tmdb2.Tmdb;
import com.uwetrottmann.tmdb2.TmdbHelper;
import jakarta.annotation.PostConstruct;
import okhttp3.OkHttpClient;
import okhttp3.OkHttpClient.Builder;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

import java.net.URI;
import java.net.URISyntaxException;

@Component
public class CustomTmdb extends Tmdb {

    public static final String API_HOST = "api.themoviedb.org";
    public static final String API_VERSION = "3";
    public static String API_URL = "https://" + API_HOST + "/" + API_VERSION + "/";

    @Value("${nzbhydra.tmdb.apikey:}")
    protected String tmdbApiKey;
    protected OkHttpClient client;

    @Autowired
    protected HydraOkHttp3ClientHttpRequestFactory requestFactory;

    public CustomTmdb() {
        super(null);
    }

    public CustomTmdb(String apiKey) {
        super(apiKey);
    }

    @PostConstruct
    private void initWithApiKey() {
        this.apiKey(tmdbApiKey);
    }

    @Override
    protected Retrofit.Builder retrofitBuilder() {
        return new Retrofit.Builder()
                .baseUrl(API_URL)
                .addConverterFactory(GsonConverterFactory.create(TmdbHelper.getGsonBuilder().create()))
                .client(okHttpClient());
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

    public static void setApiUrl(String apiUrl) {
        API_URL = apiUrl;
    }

    public static void setApiUrlFromHttpHost(String host) {
        API_URL = "http://" + host + "/" + API_VERSION + "/";
    }


}
