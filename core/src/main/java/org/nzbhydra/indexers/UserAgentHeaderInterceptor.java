package org.nzbhydra.indexers;

import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;

import java.io.IOException;


public class UserAgentHeaderInterceptor implements ClientHttpRequestInterceptor {

    private final String userAgent;

    public UserAgentHeaderInterceptor(String userAgent) {
        this.userAgent = userAgent;
    }

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
        request.getHeaders().add("X-User-Agent", userAgent);
        return execution.execute(request, body);
    }
}
