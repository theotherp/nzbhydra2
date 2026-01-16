

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
