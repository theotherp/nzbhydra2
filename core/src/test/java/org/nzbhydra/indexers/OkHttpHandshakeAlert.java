package org.nzbhydra.indexers;

import okhttp3.OkHttpClient.Builder;
import okhttp3.Request;
import org.junit.Ignore;
import org.junit.Test;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;

@Ignore //Only of OkHTTP bug report, call methods separately. See https://github.com/square/okhttp/issues/3573
public class OkHttpHandshakeAlert {
    private final String HOST_DOES_NOT_WORK_WITHOUT_SNI = "https://binsearch.info";
    private final String HOST_DOES_NOT_WORK_WITH_SNI = "https://nzbgeek.info";

    //Note: Call only one of the tests at a time, otherwise the results will be different
    //Summary: Contacting https://nzbgeek.info with SNI enabled will not work, contacting https://binsearch.info will not work with SNI disabled
    //Caused by RealConnection.java:281 which cannot be skipped / disabled

    @Test
    public void causesSslException() throws Exception {
        Builder builder = getUnsafeOkHttpClientBuilder(new Builder());
        builder.build().newCall(new Request.Builder().url(HOST_DOES_NOT_WORK_WITH_SNI).build()).execute();
    }

    @Test
    public void doesNotCauseException() throws Exception {
        //Will work with SNI disabled
        System.setProperty("jsse.enableSNIExtension", "false");
        Builder builder = getUnsafeOkHttpClientBuilder(new Builder());
        builder.build().newCall(new Request.Builder().url(HOST_DOES_NOT_WORK_WITH_SNI).build()).execute();
    }

    @Test
    public void doesNotCauseExceptionForTheOneButForTheOther() throws Exception {
        System.setProperty("jsse.enableSNIExtension", "false");
        Builder builder = getUnsafeOkHttpClientBuilder(new Builder());
        //Will work with SNI disabled
        builder.build().newCall(new Request.Builder().url(HOST_DOES_NOT_WORK_WITH_SNI).build()).execute();
        //Won't work with SNI disabled
        builder.build().newCall(new Request.Builder().url(HOST_DOES_NOT_WORK_WITHOUT_SNI).build()).execute();
    }

    @Test
    public void worksWithSNI() throws Exception {
        System.setProperty("jsse.enableSNIExtension", "true"); //default setting
        Builder builder = getUnsafeOkHttpClientBuilder(new Builder());
        //Will work with SNI enabled
        builder.build().newCall(new Request.Builder().url(HOST_DOES_NOT_WORK_WITHOUT_SNI).build()).execute();
    }


    private Builder getUnsafeOkHttpClientBuilder(Builder builder) throws Exception {
        // Create a trust manager that does not validate certificate chains
        final TrustManager[] trustAllCerts = new TrustManager[]{
                new X509TrustManager() {
                    @Override
                    public void checkClientTrusted(java.security.cert.X509Certificate[] chain,
                                                   String authType) throws CertificateException {
                    }

                    @Override
                    public void checkServerTrusted(java.security.cert.X509Certificate[] chain,
                                                   String authType) throws CertificateException {
                    }

                    @Override
                    public java.security.cert.X509Certificate[] getAcceptedIssuers() {
                        return new X509Certificate[0];
                    }
                }
        };

        // Install the all-trusting trust manager
        final SSLContext sslContext = SSLContext.getInstance("SSL");
        sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
        // Create an ssl socket factory with our all-trusting manager
        final SSLSocketFactory sslSocketFactory = sslContext.getSocketFactory();

        return builder
                .sslSocketFactory(sslSocketFactory, (X509TrustManager) trustAllCerts[0])
                .hostnameVerifier((hostname, session) -> true);
    }
}
