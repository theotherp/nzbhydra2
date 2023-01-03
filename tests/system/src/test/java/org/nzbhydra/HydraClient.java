/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra;

import okhttp3.Headers;
import okhttp3.HttpUrl;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Map;

@Component
public class HydraClient {

    @Value("${nzbhydra.host}")
    private String nzbhydraHost;
    @Value("${nzbhydra.port}")
    private int nzbhydraPort;

    private OkHttpClient getClient() {
        return new OkHttpClient();
    }

    public HydraResponse call(String method, String endpoint, Map<String, String> headers, String jsonRequestBody, String... parameters) throws Exception {
        final HttpUrl.Builder urlBuilder = new HttpUrl.Builder().scheme("http")
            .host(nzbhydraHost)
            .port(nzbhydraPort)
            .addPathSegments(StringUtils.removeStart(endpoint, "/"));

        for (String parameter : parameters) {
            final String[] split = parameter.split("=");
            urlBuilder.addQueryParameter(split[0], split[1]);
        }

        final RequestBody body = jsonRequestBody == null ? null : RequestBody.create(jsonRequestBody, MediaType.parse("application/json"));
        try (Response response = getClient().newCall(new Request.Builder()
            .headers(Headers.of(headers))
            .method(method, body)
            .url(urlBuilder.build())
            .build()).execute()) {
            try (ResponseBody responseBody = response.body()) {
                return new HydraResponse(responseBody.string(), response.code());
            }
        }
    }

    public HydraResponse get(String endpoint, Map<String, String> headers, String... parameters) throws Exception {
        return call("GET", endpoint, headers, null, parameters);
    }

    public HydraResponse get(String endpoint, String... parameters) throws Exception {
        return call("GET", endpoint, Collections.emptyMap(), null, parameters);
    }


}
