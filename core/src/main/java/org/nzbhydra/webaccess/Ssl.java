/*
 *  (C) Copyright 2020 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.webaccess;

import jakarta.annotation.PostConstruct;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.misc.DelegatingSSLSocketFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import javax.net.ssl.KeyManager;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509TrustManager;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.Socket;
import java.net.SocketException;
import java.net.UnknownHostException;
import java.security.GeneralSecurityException;
import java.security.KeyManagementException;
import java.security.KeyStore;
import java.security.NoSuchAlgorithmException;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.util.Collections;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class Ssl {

    public enum SslVerificationState {
        ENABLED,
        DISABLED_LOCAL,
        DISABLED_HOST,
        DISABLED_GLOBALLY
    }

    private static final Logger logger = LoggerFactory.getLogger(Ssl.class);

    private static final Pattern HOST_PATTERN = Pattern.compile("((\\w|\\*)+\\.)?(\\S+\\.\\S+)", Pattern.CASE_INSENSITIVE);

    @Autowired
    private ConfigProvider configProvider;

    private SSLSocketFactory defaultSslSocketFactory;
    private X509TrustManager defaultTrustManager;
    private X509TrustManager customTrustManager;

    private SSLSocketFactory allTrustingSslSocketFactory;
    private X509TrustManager allTrustingDefaultTrustManager = new AllTrustingManager();

    SSLContext caCertsContext;
    SSLContext allTrustingSslContext;

    @PostConstruct
    public void init() {
        initSocketFactory(configProvider.getBaseConfig().getMain());
    }

    @EventListener
    public void handleConfigChangedEvent(ConfigChangedEvent event) {
        initSocketFactory(event.getNewConfig().getMain());
    }

    public String getSupportedCiphers() {
        StringBuilder supportedCiphers = new StringBuilder();
        String[] defaultCiphers = defaultSslSocketFactory.getDefaultCipherSuites();
        String[] availableCiphers = defaultSslSocketFactory.getSupportedCipherSuites();

        supportedCiphers.append("Available").append("\n");
        for (String availableCipher : availableCiphers) {
            supportedCiphers.append(availableCipher).append("\n");
        }

        supportedCiphers.append("Default").append("\n");
        for (String defaultCipher : defaultCiphers) {
            supportedCiphers.append(defaultCipher).append("\n");
        }

        return supportedCiphers.toString();
    }

    public SslVerificationState getVerificationStateForHost(String host) {
        if (!configProvider.getBaseConfig().getMain().isVerifySsl()) {
            logger.debug(LoggingMarkers.HTTPS, "Ignoring SSL certificates because option not to verify SSL is set");
            return SslVerificationState.DISABLED_GLOBALLY;
        } else if (host != null && configProvider.getBaseConfig().getMain().getVerifySslDisabledFor().stream().anyMatch(x -> isSameHost(host, x))) {
            logger.debug(LoggingMarkers.HTTPS, "Ignoring SSL certificates because option not to verify SSL is set for host {}", host);
            return SslVerificationState.DISABLED_HOST;
        } else if (configProvider.getBaseConfig().getMain().isDisableSslLocally() && host != null && isLocal(host)) {
            logger.debug(LoggingMarkers.HTTPS, "Ignoring SSL certificates because host {} is local", host);
            return SslVerificationState.DISABLED_LOCAL;
        } else {
            logger.debug(LoggingMarkers.HTTPS, "Not ignoring SSL certificates");
            return SslVerificationState.ENABLED;
        }
    }

    private void initSocketFactory(MainConfig mainConfig) {
        loadCacertsAndCustomCerts();
        loadAllTrustingTrustManager();
    }

    private void loadAllTrustingTrustManager() {
        try {
            final TrustManager[] trustAllCerts = new TrustManager[]{allTrustingDefaultTrustManager};
            allTrustingSslContext = SSLContext.getInstance("SSL");
            allTrustingSslContext.init(null, trustAllCerts, new java.security.SecureRandom());
            allTrustingSslSocketFactory = new SniWhitelistingSocketFactory(allTrustingSslContext.getSocketFactory());
            allTrustingDefaultTrustManager = (X509TrustManager) trustAllCerts[0];
        } catch (NoSuchAlgorithmException | KeyManagementException e) {
            logger.error("Error while creating all-trusting trust manager", e);
        }
    }

    private void loadCacertsAndCustomCerts() {
        try {
            KeyStore keystore = KeyStore.getInstance(KeyStore.getDefaultType());
            InputStream keystoreStream = NzbHydra.class.getResource("/cacerts").openStream();
            keystore.load(keystoreStream, null);

            final File certificatesFolder = new File(NzbHydra.getDataFolder(), "certificates");
            if (certificatesFolder.exists()) {
                final File[] files = certificatesFolder.listFiles();
                logger.info("Loading {} custom certificates", files.length);
                for (File file : files) {
                    try (FileInputStream fileInputStream = new FileInputStream(file)) {
                        final Certificate certificate = CertificateFactory.getInstance("X.509").generateCertificate(fileInputStream);
                        logger.debug("Loading certificate in file {}", file);
                        keystore.setCertificateEntry(file.getName(), certificate);
                    }
                }
            }

            TrustManagerFactory customTrustManagerFactory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            customTrustManagerFactory.init(keystore);
            TrustManager[] trustManagers = customTrustManagerFactory.getTrustManagers();

            caCertsContext = SSLContext.getInstance("SSL");
            caCertsContext.init(null, trustManagers, null);
            SSLContext.setDefault(caCertsContext);
            SSLSocketFactory sslSocketFactory = caCertsContext.getSocketFactory();

            defaultTrustManager = (X509TrustManager) trustManagers[0];
            defaultSslSocketFactory = new SniWhitelistingSocketFactory(sslSocketFactory);

        } catch (IOException | GeneralSecurityException e) {
            logger.error("Unable to load packaged cacerts file", e);
        }
    }


    public SSLContext getCaCertsContext() {
        return caCertsContext;
    }

    public SSLContext getAllTrustingSslContext() {
        return allTrustingSslContext;
    }

    public SSLSocketFactory getAllTrustingSslSocketFactory() {
        return allTrustingSslSocketFactory;
    }

    public X509TrustManager getAllTrustingDefaultTrustManager() {
        return allTrustingDefaultTrustManager;
    }

    public SSLSocketFactory getDefaultSslSocketFactory() {
        return defaultSslSocketFactory;
    }

    public X509TrustManager getDefaultTrustManager() {
        return defaultTrustManager;
    }


    public static boolean isSameHost(final String a, final String b) {
        if (a == null || b == null) {
            return false;
        }
        if (a.equalsIgnoreCase(b)) {
            return true;
        }
        Matcher aMatcher = HOST_PATTERN.matcher(a);
        Matcher bMatcher = HOST_PATTERN.matcher(b);
        if (!aMatcher.matches() || !bMatcher.matches()) {
            return false;
        }

        return aMatcher.group(3).toLowerCase().equals(bMatcher.group(3).toLowerCase());
    }

    //https://stackoverflow.com/a/2406819/184264
    private static boolean isLocal(String host) {
        InetAddress addr;
        try {
            addr = InetAddress.getByName(host);
        } catch (UnknownHostException e) {
            return false;
        }
        if (addr.isAnyLocalAddress() || addr.isLoopbackAddress()) {
            return true;
        }

        try {
            return NetworkInterface.getByInetAddress(addr) != null;
        } catch (SocketException e) {
            return false;
        }
    }


    private KeyStore newEmptyKeyStore(char[] password) throws GeneralSecurityException {
        try {
            KeyStore keyStore = KeyStore.getInstance(KeyStore.getDefaultType());
            InputStream in = null; // By convention, 'null' creates an empty key store.
            keyStore.load(in, password);
            return keyStore;
        } catch (IOException e) {
            throw new AssertionError(e);
        }
    }

    private static class AllTrustingManager implements X509TrustManager {

        @Override
        public void checkClientTrusted(java.security.cert.X509Certificate[] chain, String authType) {
        }

        @Override
        public void checkServerTrusted(java.security.cert.X509Certificate[] chain, String authType) {
        }

        @Override
        public java.security.cert.X509Certificate[] getAcceptedIssuers() {
            return new java.security.cert.X509Certificate[]{};
        }
    }

    protected class SniWhitelistingSocketFactory extends DelegatingSSLSocketFactory {

        public SniWhitelistingSocketFactory(SSLSocketFactory delegate) {
            super(delegate);
        }

        @Override
        public SSLSocket createSocket(Socket socket, final String host, int port, boolean autoClose) throws IOException {
            SSLSocket newSocket = super.createSocket(socket, host, port, autoClose);
            if (host != null && configProvider.getBaseConfig().getMain().getSniDisabledFor().stream().anyMatch(x -> isSameHost(host, x))) {
                logger.debug(LoggingMarkers.HTTPS, "Ignoring SNI for  host name {}", host);
                SSLParameters sslParameters = newSocket.getSSLParameters();
                sslParameters.setServerNames(Collections.emptyList());
                newSocket.setSSLParameters(sslParameters);
            }
            return newSocket;
        }
    }

    private static class KeyAndTrustManagers {
        final KeyManager[] keyManagers;
        final TrustManager[] trustManagers;

        KeyAndTrustManagers(KeyManager[] keyManagers, TrustManager[] trustManagers) {
            this.keyManagers = keyManagers;
            this.trustManagers = trustManagers;
        }
    }

}
