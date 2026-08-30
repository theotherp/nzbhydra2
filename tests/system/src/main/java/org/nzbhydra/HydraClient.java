

package org.nzbhydra;

import com.google.common.collect.Sets;
import jakarta.annotation.PostConstruct;
import org.awaitility.Awaitility;
import okhttp3.Cookie;
import okhttp3.CookieJar;
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
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class HydraClient {

    private static final Logger logger = LoggerFactory.getLogger(HydraClient.class);
    @Value("${nzbhydra.host}")
    private String nzbhydraHost;
    @Value("${nzbhydra.port}")
    private int nzbhydraPort;


    @Autowired
    private Environment environment;

    private final AtomicLong mutatingRequests = new AtomicLong();

    @PostConstruct
    public void logData() {
        logger.info("Using NZBHydra host {} and port {}", nzbhydraHost, nzbhydraPort);
    }

    private OkHttpClient getClient(boolean followRedirects, Session session) {
        OkHttpClient.Builder builder = new OkHttpClient.Builder()
                .followRedirects(followRedirects)
                .readTimeout(20, TimeUnit.SECONDS);
        if (session != null) {
            builder.cookieJar(session.cookieJar);
        }
        return builder.build();
    }

    public HydraResponse call(String method, String endpoint, Map<String, String> headers, Object requestBody, String... parameters) {
        return call(method, endpoint, headers, requestBody, true, parameters);
    }

    public HydraResponse call(String method, String endpoint, Map<String, String> headers, Object requestBody, boolean followRedirects, String... parameters) {
        return call(method, endpoint, headers, requestBody, followRedirects, RequestOptions.defaults(), parameters);
    }

    private HydraResponse call(String method, String endpoint, Map<String, String> headers, Object requestBody,
                               boolean followRedirects, RequestOptions options, String... parameters) {

        Map<String, String> requestHeaders = new HashMap<>(headers);

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
        if (options.username != null) {
            requestHeaders.put("Authorization", basicAuthorization(options.username, options.password));
        } else if (v1Migration && options.internalApiKey == null && !requestHeaders.containsKey("Authorization")) {
            requestHeaders.put("Authorization", basicAuthorization("test", "test"));
        }
        if (!externalRequest && endpoint.contains("internalapi") && Arrays.stream(parameters).noneMatch(x -> x.startsWith("internalApiKey"))) {
            if (options.internalApiKey != null) {
                urlBuilder.addQueryParameter("internalApiKey", options.internalApiKey);
            } else if (!options.omitInternalApiKey) {
                // Must be provided to the instance in the docker container.
                urlBuilder.addQueryParameter("internalApiKey", "internalApiKey");
            }
        }
        if (!"GET".equals(method)) {
            mutatingRequests.incrementAndGet();
        }
        RequestBody body = createRequestBody(requestBody);
        if (body == null && (method.equals("POST") || method.equals("PUT") || method.equals("PATCH"))) {
            body = RequestBody.create(new byte[0], null);
        }
        final Request request = new Request.Builder()
                .headers(Headers.of(requestHeaders))
                .method(method, body)
                .url(urlBuilder.build())
                .build();
        logger.debug("Making request {}", request);
        try (Response response = getClient(followRedirects, options.session).newCall(request).execute()) {
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

    public HydraResponse getWithoutInternalApiKey(String endpoint, String... parameters) {
        return call("GET", endpoint, Collections.emptyMap(), null, true, RequestOptions.withoutInternalApiKey(), parameters);
    }

    public HydraResponse getWithInternalApiKey(String endpoint, String internalApiKey, String... parameters) {
        return call("GET", endpoint, Collections.emptyMap(), null, true, RequestOptions.withInternalApiKey(internalApiKey), parameters);
    }

    public HydraResponse getWithBasicAuth(String endpoint, String username, String password, String... parameters) {
        return call("GET", endpoint, Collections.emptyMap(), null, true, RequestOptions.withBasicAuth(username, password), parameters);
    }

    public HydraResponse getWithSession(String endpoint, Session session, String... parameters) {
        return call("GET", endpoint, Collections.emptyMap(), null, true, RequestOptions.withSession(session), parameters);
    }

    public HydraResponse getWithBasicAuth(String endpoint, Session session, String username, String password, String... parameters) {
        return call("GET", endpoint, Collections.emptyMap(), null, true, RequestOptions.withSessionAndBasicAuth(session, username, password), parameters);
    }

    public HydraResponse getExternal(String endpoint, String... parameters) {
        return get(endpoint, parameters);
    }

    public HydraResponse delete(String endpoint, Map<String, String> headers, String... parameters) {
        return call("DELETE", endpoint, headers, null, parameters);
    }

    public HydraResponse put(String endpoint, Object body, String... parameters) {
        return call("PUT", endpoint, Collections.emptyMap(), body, parameters);
    }

    public HydraResponse put(String endpoint, Object body, Map<String, String> headers, String... parameters) {
        return call("PUT", endpoint, headers, body, parameters);
    }

    public HydraResponse putWithBasicAuth(String endpoint, String username, String password, Object body, String... parameters) {
        return call("PUT", endpoint, Collections.emptyMap(), body, true, RequestOptions.withBasicAuth(username, password), parameters);
    }

    public HydraResponse post(String endpoint, Object body, String... parameters) {
        return call("POST", endpoint, Collections.emptyMap(), body, parameters);
    }

    public HydraResponse postWithSession(String endpoint, Session session, Object body, String... parameters) {
        return call("POST", endpoint, Collections.emptyMap(), body, true, RequestOptions.withSession(session), parameters);
    }

    public HydraResponse postWithSessionWithoutRedirects(String endpoint, Session session, Object body, String... parameters) {
        return call("POST", endpoint, Collections.emptyMap(), body, false, RequestOptions.withSession(session), parameters);
    }

    /**
     * Returns the instance to the checked-in baseline in one call: the whole configuration, the generic storage
     * (including the {@code forUser} keys) and the welcome-shown flag (ADR-0048).
     *
     * <p>The baseline lives on the server, in {@code config/baseConfig.yml}. Nothing this client sends contributes a
     * value, which is the point: {@code GET /internalapi/config} masks secrets as {@code ***UNCHANGED***}, and since
     * FM-068 a save carrying a marker that cannot be matched to a stored record is refused - so a captured snapshot
     * cannot be put back, while this call always can.
     *
     * <p>The endpoint exists only under the {@code systemtest} Spring profile; against an instance started without
     * it the call returns 404.
     */
    public HydraResponse resetToBaseline() {
        return post("/internalapi/systemtest/reset", null);
    }

    /**
     * How many requests this client has made that could have changed the instance's state - everything that is not a
     * {@code GET}.
     *
     * <p>{@link BeforeAll#applyBaseline()} uses it to tell "nothing has happened since I last wrote the baseline" from
     * "something has", which is what lets it skip the write. A count rather than a flag so a caller can compare against
     * a value it recorded earlier without any reset protocol between them.
     */
    public long mutatingRequestCount() {
        return mutatingRequests.get();
    }

    /**
     * Waits until the instance has gone away and come back, for up to 90 seconds.
     *
     * <p>Both halves matter. A restart takes long enough to start that a health check made immediately after asking for
     * one still answers from the old process, so waiting only for "healthy" returns before the restart has begun and
     * the caller then asserts against configuration the restart is about to replace. The wait therefore only completes
     * once the instance has first been observed unavailable.
     *
     * <p>{@code AuthorizationSystemTest} and {@code BackupRestoreSystemTest} each carried a copy of this loop.
     */
    public void awaitRestart() {
        final AtomicBoolean becameUnavailable = new AtomicBoolean();
        Awaitility.await().atMost(Duration.ofSeconds(90)).until(() -> {
            try {
                boolean healthy = get("/actuator/health/ping").status() == 200;
                return becameUnavailable.get() && healthy;
            } catch (RuntimeException e) {
                becameUnavailable.set(true);
                return false;
            }
        });
    }

    /**
     * Waits until the instance answers its health check, for up to 90 seconds, without requiring it to have been
     * unavailable first. For callers that may or may not have triggered a restart.
     */
    public void awaitHealthy() {
        Awaitility.await().atMost(Duration.ofSeconds(90)).ignoreExceptions()
                .until(() -> get("/actuator/health/ping").status() == 200);
    }

    public Session createSession() {
        return new Session();
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
        mutatingRequests.incrementAndGet();
        Request.Builder requestBuilder = new Request.Builder().post(body).url(urlBuilder.build());
        if (v1Migration) {
            requestBuilder.header("Authorization", "Basic " + Base64.getEncoder().encodeToString("test:test".getBytes(StandardCharsets.UTF_8)));
        }
        Request request = requestBuilder.build();
        try (Response response = getClient(true, null).newCall(request).execute(); ResponseBody responseBody = response.body()) {
            return new HydraResponse(responseBody.bytes(), response.code(), response.headers().toMultimap());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static String basicAuthorization(String username, String password) {
        return "Basic " + Base64.getEncoder().encodeToString((username + ":" + password).getBytes(StandardCharsets.UTF_8));
    }

    public static final class Session {

        private final SessionCookieJar cookieJar = new SessionCookieJar();

        public boolean hasCookie(String name) {
            return cookieJar.hasCookie(name);
        }
    }

    private static final class RequestOptions {

        private final boolean omitInternalApiKey;
        private final String internalApiKey;
        private final String username;
        private final String password;
        private final Session session;

        private RequestOptions(boolean omitInternalApiKey, String internalApiKey, String username, String password, Session session) {
            this.omitInternalApiKey = omitInternalApiKey;
            this.internalApiKey = internalApiKey;
            this.username = username;
            this.password = password;
            this.session = session;
        }

        private static RequestOptions defaults() {
            return new RequestOptions(false, null, null, null, null);
        }

        private static RequestOptions withoutInternalApiKey() {
            return new RequestOptions(true, null, null, null, null);
        }

        private static RequestOptions withInternalApiKey(String internalApiKey) {
            return new RequestOptions(false, internalApiKey, null, null, null);
        }

        private static RequestOptions withBasicAuth(String username, String password) {
            return new RequestOptions(true, null, username, password, null);
        }

        private static RequestOptions withSession(Session session) {
            return new RequestOptions(true, null, null, null, session);
        }

        private static RequestOptions withSessionAndBasicAuth(Session session, String username, String password) {
            return new RequestOptions(true, null, username, password, session);
        }
    }

    private static final class SessionCookieJar implements CookieJar {

        private final List<Cookie> cookies = new ArrayList<>();

        @Override
        public synchronized void saveFromResponse(HttpUrl url, List<Cookie> responseCookies) {
            for (Cookie responseCookie : responseCookies) {
                cookies.removeIf(cookie -> cookie.name().equals(responseCookie.name()) && cookie.matches(url));
                if (responseCookie.expiresAt() > System.currentTimeMillis()) {
                    cookies.add(responseCookie);
                }
            }
        }

        @Override
        public synchronized List<Cookie> loadForRequest(HttpUrl url) {
            cookies.removeIf(cookie -> cookie.expiresAt() <= System.currentTimeMillis());
            return cookies.stream().filter(cookie -> cookie.matches(url)).toList();
        }

        private synchronized boolean hasCookie(String name) {
            return cookies.stream().anyMatch(cookie -> cookie.name().equals(name) && cookie.expiresAt() > System.currentTimeMillis());
        }
    }


}
