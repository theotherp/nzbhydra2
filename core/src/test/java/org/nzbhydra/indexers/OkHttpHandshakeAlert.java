package org.nzbhydra.indexers;

import okhttp3.OkHttpClient.Builder;
import okhttp3.Request;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;

@Disabled //Only of OkHTTP bug report, call methods separately. See https://github.com/square/okhttp/issues/3573
public class OkHttpHandshakeAlert {
    private final String HOST_DOES_NOT_WORK_WITHOUT_SNI = "https://binsearch.info";
    private final String HOST_DOES_NOT_WORK_WITH_SNI = "https://nzbgeek.info";

    //Note: Call only one of the tests at a time, otherwise the results will be different
    //Summary: Contacting https://nzbgeek.info with SNI enabled will not work, contacting https://binsearch.info will not work with SNI disabled
    //Caused by RealConnection.java:281 which cannot be skipped / disabled

    @Test
    void causesSslException() throws Exception {
        Builder builder = getUnsafeOkHttpClientBuilder(new Builder());

        builder.build().newCall(new Request.Builder().url(HOST_DOES_NOT_WORK_WITH_SNI).build()).execute();
    }

    @Test
    void doesNotCauseException() throws Exception {
        //Will work with SNI disabled
        System.setProperty("jsse.enableSNIExtension", "false");
        Builder builder = getUnsafeOkHttpClientBuilder(new Builder());
        builder.build().newCall(new Request.Builder().url(HOST_DOES_NOT_WORK_WITH_SNI).build()).execute();
    }

    @Test
    void doesNotCauseExceptionForTheOneButForTheOther() throws Exception {
        System.setProperty("jsse.enableSNIExtension", "false");
        Builder builder = getUnsafeOkHttpClientBuilder(new Builder());
        //Will work with SNI disabled
        builder.build().newCall(new Request.Builder().url(HOST_DOES_NOT_WORK_WITH_SNI).build()).execute();
        //Won't work with SNI disabled
        builder.build().newCall(new Request.Builder().url(HOST_DOES_NOT_WORK_WITHOUT_SNI).build()).execute();
    }

    @Test
    void worksWithSNI() throws Exception {
        System.setProperty("jsse.enableSNIExtension", "true"); //default setting
        Builder builder = getUnsafeOkHttpClientBuilder(new Builder());
        //Will work with SNI enabled
        builder.build().newCall(new Request.Builder().url(HOST_DOES_NOT_WORK_WITHOUT_SNI).build()).execute();
    }


    private Builder getUnsafeOkHttpClientBuilder(Builder builder) throws Exception {
        // Create a trust manager that does not validate certificate chains
        final TrustManager[] trustAllCerts = getTrustManagers();
        final SSLSocketFactory sslSocketFactory = getSslSocketFactory(trustAllCerts);


        return builder
                .sslSocketFactory(sslSocketFactory, (X509TrustManager) trustAllCerts[0])
                .hostnameVerifier((hostname, session) -> true);
    }

    private SSLSocketFactory getSslSocketFactory(TrustManager[] trustAllCerts) throws NoSuchAlgorithmException, KeyManagementException {
        // Install the all-trusting trust manager
        final SSLContext sslContext = SSLContext.getInstance("SSL");
        sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
        // Create an ssl socket factory with our all-trusting manager
        return sslContext.getSocketFactory();
    }

    private TrustManager[] getTrustManagers() {
        return new TrustManager[]{
                getX509TrustManager()
        };
    }

    private X509TrustManager getX509TrustManager() {
        return new X509TrustManager() {
            @Override
            public void checkClientTrusted(X509Certificate[] chain,
                                           String authType) throws CertificateException {
            }

            @Override
            public void checkServerTrusted(X509Certificate[] chain,
                                           String authType) throws CertificateException {
            }

            @Override
            public X509Certificate[] getAcceptedIssuers() {
                return new X509Certificate[0];
            }
        };
    }


}
