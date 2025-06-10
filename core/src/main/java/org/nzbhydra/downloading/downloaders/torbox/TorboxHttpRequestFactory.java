/*
 *  (C) Copyright 2025 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.downloading.downloaders.torbox;

import okhttp3.OkHttpClient;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.nzbhydra.webaccess.OkHttp3ClientHttpRequest;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.stereotype.Component;

import java.net.URI;

@Component
public class TorboxHttpRequestFactory extends HydraOkHttp3ClientHttpRequestFactory {

    public static final int TIMEOUT_SECONDS = 90;

    @Override
    public ClientHttpRequest createRequest(URI uri, HttpMethod httpMethod) {
        OkHttpClient client = getOkHttpClient(uri.getHost(), TIMEOUT_SECONDS);
        return new OkHttp3ClientHttpRequest(client, uri, httpMethod);
    }
}
