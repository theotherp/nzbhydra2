

package org.nzbhydra;

import com.google.common.collect.Sets;
import jakarta.annotation.PostConstruct;
import okhttp3.Headers;
import okhttp3.HttpUrl;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.apache.commons.lang3.StringUtils;
import org.jetbrains.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Component
public class HydraClient {

    private static final Logger logger = LoggerFactory.getLogger(HydraClient.class);
    public static final String DISABLE_INTERNAL_APIKEY = "DISABLE_INTERNAL_APIKEY";


    @Value("${nzbhydra.host}")
    private String nzbhydraHost;
    @Value("${nzbhydra.port}")
    private int nzbhydraPort;


    @Autowired
    private Environment environment;

    @PostConstruct
    public void logData() {
        logger.info("Using NZBHydra host " + nzbhydraHost + " and port " + nzbhydraPort);
    }

    private OkHttpClient getClient(boolean followRedirects) {
        return new OkHttpClient.Builder().followRedirects(followRedirects).readTimeout(20, TimeUnit.SECONDS).build();
    }

    public HydraResponse call(String method, String endpoint, Map<String, String> headers, Object requestBody, String... parameters) {
        return call(method, endpoint, headers, requestBody, true, parameters);
    }

    public HydraResponse call(String method, String endpoint, Map<String, String> headers, Object requestBody, boolean followRedirects, String... parameters) {

        final boolean externalRequest = endpoint.startsWith("http://") || endpoint.startsWith("https://");
        final boolean v1Migration = !externalRequest && Sets.newHashSet(environment.getActiveProfiles()).contains("v1Migration");
        if (v1Migration) {
            //Use URL base
            endpoint = "/nzbhydra2" + endpoint;
        }


        final HttpUrl.Builder urlBuilder;
        if (externalRequest) {
            urlBuilder = HttpUrl.get(endpoint).newBuilder();
        } else {
            urlBuilder = new HttpUrl.Builder().scheme("http")
                    .host(nzbhydraHost)
                    .port(nzbhydraPort)
                    .addPathSegments(StringUtils.removeStart(endpoint, "/"));
        }


        for (String parameter : parameters) {
            final String[] split = parameter.split("=", 2);
            urlBuilder.addQueryParameter(split[0], split[1]);
        }
        if (v1Migration && !headers.containsKey("Authorization")) {
            headers = new HashMap<>(headers);
            headers.put("Authorization", "Basic " + new String(Base64.getEncoder().encode("test:test".getBytes(StandardCharsets.UTF_8))));
        } else if (!externalRequest && endpoint.contains("internalapi") && Arrays.stream(parameters).noneMatch(x -> x.startsWith("internalApiKey"))) {
            //Must be provided to instance in docker container
            if (!headers.containsKey(DISABLE_INTERNAL_APIKEY)) {
                urlBuilder.addQueryParameter("internalApiKey", "internalApiKey");
            } else {
                headers.remove(DISABLE_INTERNAL_APIKEY);
            }
        }
        final RequestBody body = createRequestBody(requestBody);
        final Request request = new Request.Builder()
                .headers(Headers.of(headers))
                .method(method, body)
                .url(urlBuilder.build())
                .build();
        logger.debug("Making request {}", request);
        try (Response response = getClient(followRedirects).newCall(request).execute()) {
            try (ResponseBody responseBody = response.body()) {
                return new HydraResponse(responseBody.bytes(), response.code(), response.headers().toMultimap());
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Nullable
    private static RequestBody createRequestBody(Object requestBody) {
        final RequestBody body;
        if (requestBody == null) {
            body = null;
        } else {
            String jsonRequestBody;
            if (requestBody instanceof String) {
                jsonRequestBody = (String) requestBody;
            } else {
                try {
                    jsonRequestBody = Jackson.JSON_MAPPER.writeValueAsString(requestBody);
                } catch (JacksonException e) {
                    throw new RuntimeException(e);
                }
            }
            body = RequestBody.create(jsonRequestBody, MediaType.parse("application/json"));
        }
        return body;
    }

    public HydraResponse get(String endpoint, Map<String, String> headers, String... parameters) {
        return call("GET", endpoint, headers, null, parameters);
    }

    public HydraResponse get(String endpoint, String... parameters) {
        return call("GET", endpoint, Collections.emptyMap(), null, parameters);
    }

    public HydraResponse getWithoutRedirects(String endpoint, String... parameters) {
        return call("GET", endpoint, Collections.emptyMap(), null, false, parameters);
    }

    public HydraResponse getExternal(String endpoint, String... parameters) {
        return get(endpoint, parameters);
    }

    public HydraResponse put(String endpoint, Object body, String... parameters) {
        return call("PUT", endpoint, Collections.emptyMap(), body, parameters);
    }

    public HydraResponse put(String endpoint, Object body, Map<String, String> headers, String... parameters) {
        return call("PUT", endpoint, headers, body, parameters);
    }

    public HydraResponse post(String endpoint, Object body, String... parameters) {
        return call("POST", endpoint, Collections.emptyMap(), body, parameters);
    }

    public HydraResponse postMultipartFile(String endpoint, byte[] contents, String filename, String mediaType, String fieldName,
                                           String... parameters) {
        RequestBody fileBody = RequestBody.create(contents, MediaType.parse(mediaType));
        RequestBody multipartBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart(fieldName, filename, fileBody)
                .build();
        return callMultipart(endpoint, multipartBody, parameters);
    }

    public HydraResponse postMultipartFile(String endpoint, Path path, String filename, String mediaType, String fieldName,
                                           String... parameters) {
        try {
            return postMultipartFile(endpoint, java.nio.file.Files.readAllBytes(path), filename, mediaType, fieldName, parameters);
        } catch (java.io.IOException e) {
            throw new RuntimeException(e);
        }
    }

    private HydraResponse callMultipart(String endpoint, RequestBody body, String... parameters) {
        boolean v1Migration = Sets.newHashSet(environment.getActiveProfiles()).contains("v1Migration");
        if (v1Migration) {
            endpoint = "/nzbhydra2" + endpoint;
        }
        final HttpUrl.Builder urlBuilder = new HttpUrl.Builder().scheme("http")
                .host(nzbhydraHost)
                .port(nzbhydraPort)
                .addPathSegments(StringUtils.removeStart(endpoint, "/"));
        for (String parameter : parameters) {
            String[] split = parameter.split("=", 2);
            urlBuilder.addQueryParameter(split[0], split[1]);
        }
        if (endpoint.contains("internalapi")) {
            urlBuilder.addQueryParameter("internalApiKey", "internalApiKey");
        }
        Request.Builder requestBuilder = new Request.Builder().post(body).url(urlBuilder.build());
        if (v1Migration) {
            requestBuilder.header("Authorization", "Basic " + Base64.getEncoder().encodeToString("test:test".getBytes(StandardCharsets.UTF_8)));
        }
        Request request = requestBuilder.build();
        try (Response response = getClient(true).newCall(request).execute(); ResponseBody responseBody = response.body()) {
            return new HydraResponse(responseBody.bytes(), response.code(), response.headers().toMultimap());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }


}
