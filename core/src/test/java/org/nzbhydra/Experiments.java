/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import lombok.Data;
import okhttp3.Call;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.junit.Ignore;
import org.junit.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.IndexerCategoryConfig;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.misc.DelegatingSSLSocketFactory;

import javax.net.ssl.*;
import java.io.IOException;
import java.net.Socket;
import java.security.GeneralSecurityException;
import java.security.KeyManagementException;
import java.security.KeyStore;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static junit.framework.TestCase.assertTrue;

public class Experiments {

    @Test
    @Ignore
    public void bla() throws IOException, InterruptedException {
        for (int i = 0; i < 1000; i++) {
            Call call = new OkHttpClient.Builder().build().newCall(new Request.Builder().url("http://127.0.0.1:5076/api?apikey=apikey&t=search&q=blade%20runner").build());
            call.execute();
            Thread.sleep(100);
        }
    }

    @Test
    @Ignore
    public void createSimpleYaml() throws IOException, InterruptedException {
        ObjectMapper objectMapper = new ObjectMapper(new YAMLFactory());
        objectMapper.registerModule(new Jdk8Module());

        IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setCategoryMapping(new IndexerCategoryConfig());

        BaseConfig baseConfig = new BaseConfig();
        baseConfig.setIndexers(Arrays.asList(indexerConfig));
        String s = objectMapper.writeValueAsString(baseConfig);
        System.out.println(s);

        objectMapper.readValue(s, BaseConfig.class);
    }

    @Test
    @Ignore
    public void createTestYaml() throws IOException, InterruptedException {
        ObjectMapper objectMapper = new ObjectMapper(new YAMLFactory());

        MainClass mainClass = new MainClass();
        MainClass.SubEntry subEntry = new MainClass.SubEntry();
        subEntry.setSubSubentry(new MainClass.SubEntry.SubSubentry());
        mainClass.setSubEntries(Arrays.asList(subEntry));
        String s = objectMapper.writeValueAsString(mainClass);
        System.out.println(s);

        objectMapper.readValue(s, MainClass.class);
    }

    @Test
    @Ignore
    public void connectToAlthub() throws Exception {

        SSLSocketFactory sslSocketFactory = getSslSocketFactory(new TrustManager[]{
                getDefaultX509TrustManager()
        });
        OkHttpClient client = new OkHttpClient.Builder()
                .sslSocketFactory(new SniWhitelistingSocketFactory(sslSocketFactory), getDefaultX509TrustManager())
                .build();

        Request request = new Request.Builder()
                .url("https://api.althub.co.za")

                .build();

        Response response = client.newCall(request).execute();
        assertTrue(response.isSuccessful());

    }

    private X509TrustManager getDefaultX509TrustManager() {
        try {
            TrustManagerFactory trustManagerFactory = TrustManagerFactory.getInstance(
                    TrustManagerFactory.getDefaultAlgorithm());
            trustManagerFactory.init((KeyStore) null);
            TrustManager[] trustManagers = trustManagerFactory.getTrustManagers();
            if (trustManagers.length != 1 || !(trustManagers[0] instanceof X509TrustManager)) {
                throw new IllegalStateException("Unexpected default trust managers:"
                        + Arrays.toString(trustManagers));
            }
            return (X509TrustManager) trustManagers[0];
        } catch (GeneralSecurityException e) {
            throw new AssertionError(); // The system has no TLS. Just give up.
        }
    }


    private SSLSocketFactory getSslSocketFactory(TrustManager[] trustAllCerts) throws NoSuchAlgorithmException, KeyManagementException {
        final SSLContext sslContext = SSLContext.getInstance("SSL");
        sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
        return sslContext.getSocketFactory();
    }


    protected class SniWhitelistingSocketFactory extends DelegatingSSLSocketFactory {

        public SniWhitelistingSocketFactory(SSLSocketFactory delegate) {
            super(delegate);
        }

        @Override
        public SSLSocket createSocket(Socket socket, final String host, int port, boolean autoClose) throws IOException {
            return super.createSocket(socket, null, port, autoClose);
        }
    }

    @Data
    public static class MainClass {
        private List<SubEntry> subEntries = new ArrayList<>();

        @Data
        public static class SubEntry {
            private SubSubentry subSubentry;

            @Data
            public static class SubSubentry {
                private Integer entry1 = null;
                private Integer entry2 = null;
                private Integer entry3 = null;
            }

        }
    }


}
