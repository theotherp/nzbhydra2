package org.nzbhydra.debuginfos;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.apache.commons.lang3.StringUtils;
import org.nzbhydra.Jackson;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.util.Map;

/**
 * Uploads debug infos to https://tmpfiles.org, which needs neither an API key for uploading nor an account for
 * downloading. The previously used file.io shut down its anonymous API (every request to its documented API host is
 * redirected to its marketing site) after it was taken over by LimeWire.
 */
@Component
public class TmpFilesUploader {

    private static final Logger logger = LoggerFactory.getLogger(TmpFilesUploader.class);

    private static final String UPLOAD_URL = "https://tmpfiles.org/api/v1/upload";
    private static final String HOST = "tmpfiles.org";
    /**
     * The longest expiry the API accepts (48 hours); anything longer is rejected. See https://tmpfiles.org/api.
     */
    private static final String EXPIRE_SECONDS = "172800";
    private static final int TIMEOUT_SECONDS = 300;

    @Autowired
    private HydraOkHttp3ClientHttpRequestFactory clientHttpRequestFactory;

    public String upload(File file) throws IOException {
        logger.info("Starting upload of debug infos file {}", file);

        final String json = uploadFile(file);
        final String url = extractUrl(json);

        logger.info("Uploaded debug infos to {}. The file will be deleted after 48 hours", url);

        return url;
    }

    private String uploadFile(File file) throws IOException {
        logger.debug("Sending upload POST to {}", UPLOAD_URL);
        final OkHttpClient httpClient = clientHttpRequestFactory.getOkHttpClient(HOST, TIMEOUT_SECONDS);
        try (Response response = httpClient.newCall(new Request.Builder()
            .url(UPLOAD_URL)
            .post(new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("expire", EXPIRE_SECONDS)
                .addFormDataPart("file", "nzbhydra2-debug-infos.zip", RequestBody.create(file, MediaType.parse("application/octet-stream")))
                .build())
            .build()).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException(createErrorFromResponse(response, "Error uploading debug infos. Status: "));
            }
            logger.debug("Successfully uploaded file");
            final ResponseBody body = response.body();
            if (body == null) {
                throw new IOException("Upload of debug infos returned an empty response");
            }
            return body.string();
        }
    }

    private String extractUrl(String json) throws IOException {
        final Map<?, ?> map = Jackson.JSON_MAPPER.readValue(json, Map.class);
        final Object data = map.get("data");
        final Object url = data instanceof Map<?, ?> dataMap ? dataMap.get("url") : null;
        if (!(url instanceof String urlString) || urlString.isBlank()) {
            throw new IOException("Unable to find the upload URL in the response:\n" + StringUtils.abbreviate(json, 500));
        }
        return urlString;
    }

    private String createErrorFromResponse(Response response, String prefix) throws IOException {
        String message = prefix + response.code();
        if (StringUtils.isNotEmpty(response.message())) {
            message += ". Message: " + response.message();
        }
        final ResponseBody body = response.body();
        if (body != null) {
            final String bodyString = body.string();
            if (StringUtils.isNotEmpty(bodyString)) {
                message += ". Body:\n" + StringUtils.abbreviate(bodyString, 500);
            }
        }
        logger.error(message);
        return message;
    }
}
