

package org.nzbhydra.webaccess;

import okhttp3.Response;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.AbstractClientHttpResponse;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.util.Assert;

import java.io.IOException;
import java.io.InputStream;

/**
 * {@link ClientHttpResponse} implementation based on OkHttp 3.x.
 *
 * @author Luciano Leggieri
 * @author Arjen Poutsma
 * @author Roy Clarkson
 * @since 4.3
 */
class OkHttp3ClientHttpResponse extends AbstractClientHttpResponse {

    private final Response response;

    private HttpHeaders headers;


    public OkHttp3ClientHttpResponse(Response response) {
        Assert.notNull(response, "Response must not be null");
        this.response = response;
    }


    @Override
    public int getRawStatusCode() {
        return this.response.code();
    }

    @Override
    public String getStatusText() {
        return this.response.message();
    }

    @Override
    public InputStream getBody() throws IOException {
        return this.response.body().byteStream();
    }

    @Override
    public HttpHeaders getHeaders() {
        if (this.headers == null) {
            HttpHeaders headers = new HttpHeaders();
            for (String headerName : this.response.headers().names()) {
                for (String headerValue : this.response.headers(headerName)) {
                    headers.add(headerName, headerValue);
                }
            }
            this.headers = headers;
        }
        return this.headers;
    }

    @Override
    public void close() {
        this.response.body().close();
        this.response.close();
    }

}
