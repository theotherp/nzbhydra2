/*
 * Copyright 2002-2016 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.nzbhydra.webaccess;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpResponse;

import java.io.IOException;
import java.net.URI;

/**
 * {@link ClientHttpRequest} implementation based on OkHttp 3.x.
 * <p>
 * <p>Created via the {@link HydraOkHttp3ClientHttpRequestFactory}.
 *
 * @author Luciano Leggieri
 * @author Arjen Poutsma
 * @author Roy Clarkson
 * @since 4.3
 */
class OkHttp3ClientHttpRequest extends AbstractBufferingClientHttpRequest {

    private final OkHttpClient client;

    private final URI uri;

    private final HttpMethod method;


    public OkHttp3ClientHttpRequest(OkHttpClient client, URI uri, HttpMethod method) {
        this.client = client;
        this.uri = uri;
        this.method = method;
    }


    @Override
    public HttpMethod getMethod() {
        return this.method;
    }

    @Override
    public URI getURI() {
        return this.uri;
    }


    @Override
    protected ClientHttpResponse executeInternal(HttpHeaders headers, byte[] content) throws IOException {
        Request request = HydraOkHttp3ClientHttpRequestFactory.buildRequest(headers, content, this.uri, this.method);
        return new OkHttp3ClientHttpResponse(this.client.newCall(request).execute());
    }

}
