package org.nzbhydra.okhttp;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.base.Strings;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Request.Builder;
import okhttp3.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.TimeUnit;

@SuppressWarnings("ConstantConditions")
@Component
public class WebAccess {

    private static final Logger logger = LoggerFactory.getLogger(WebAccess.class);

    @Autowired
    private HydraOkHttp3ClientHttpRequestFactory requestFactory;
    @Value("${nzbhydra.connectionTimeout:10}")
    private int timeout;
    ObjectMapper objectMapper = new ObjectMapper();
    @Autowired
    private ConfigurableEnvironment environment;

    public String callUrl(String url) throws IOException {
        return callUrl(url, new HashMap<>());
    }

    public String callUrl(String url, Map<String, String> headers) throws IOException {
        return callUrl(url, headers, timeout);
    }

    public String callUrl(String url, Map<String, String> headers, int timeout) throws IOException {
        Builder builder = new Builder().url(url);
        for (Entry<String, String> entry : headers.entrySet()) {
            builder.addHeader(entry.getKey(), entry.getValue());
        }
        if (url.toLowerCase().contains("github.com")) {
            String token = environment.getProperty("githubToken");
            if (!Strings.isNullOrEmpty(token)) {
                builder.addHeader("Authorization", "token " + token);
            }
        }

        Request request = builder.build();

        OkHttpClient client = requestFactory.getOkHttpClientBuilder(request.url().uri()).readTimeout(timeout, TimeUnit.SECONDS).connectTimeout(timeout, TimeUnit.SECONDS).writeTimeout(timeout, TimeUnit.SECONDS).build();
        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String error = String.format("URL call to %s returned %d:%s", url, response.code(), response.message());
                logger.error(error);
                throw new IOException(error);
            }
            String body = response.body().string();
            response.body().close();
            return body;
        }
    }

    public <T> T callUrl(String url, Map<String, String> headers, Class<T> clazz) throws IOException {
        String body = callUrl(url, headers);
        return objectMapper.readValue(body, clazz);
    }

    public <T> T callUrl(String url, TypeReference valueTypeRef) throws IOException {
        String body = callUrl(url);
        return objectMapper.readValue(body, valueTypeRef);
    }

    public void downloadToFile(String url, File file) throws IOException {
        Request request = new Request.Builder().url(url).build();
        try (Response response = requestFactory.getOkHttpClientBuilder(request.url().uri()).build().newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String error = String.format("URL call to %s returned %d:%s", url, response.code(), response.message());
                logger.error(error);
                throw new IOException(error);
            }
            Files.copy(response.body().byteStream(), file.toPath());
            response.body().close();
        }
    }

    public class WebAccessResponse {
        String response;

    }

}
