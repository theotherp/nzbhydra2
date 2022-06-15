/*
 *  (C) Copyright 2021 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.debuginfos;

import okhttp3.FormBody;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.apache.commons.lang3.StringUtils;
import org.nzbhydra.Jackson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.Charset;
import java.util.Map;

public class UfileUploader {

    private static final Logger logger = LoggerFactory.getLogger(UfileUploader.class);
    private static final String UFILE_UP_API_PATH = "https://ufile.io/v1";

    public static String upload(File file) throws IOException {
        final OkHttpClient httpClient = new OkHttpClient();

        logger.info("Starting upload of debug infos file {}", file);

        final String token = getToken(httpClient, file);

        uploadFile(file, httpClient, token);

        final String jsonResponse = finalize(file, httpClient, token);

        final String url = URLDecoder.decode((String) Jackson.JSON_MAPPER.readValue(jsonResponse, Map.class).get("destination"), Charset.defaultCharset().toString());

        logger.info("Uploaded debug infos to {}", url);

        return url;
    }

    private static String getToken(OkHttpClient httpClient, File file) throws IOException {
        final String url = UFILE_UP_API_PATH + "/upload/create_session";
        logger.debug("Sending token POST to {}", url);
        final Response post = httpClient.newCall(new Request.Builder()
                .url(url)
                .method("POST",
                        new FormBody.Builder()
                                .add("file_size", String.valueOf(file.length()))
                                .build()
                )
                .build()).execute();
        final String jsonResponse;
        try (ResponseBody body = post.body()) {
            if (!post.isSuccessful()) {
                throw new IOException(createErrorFromResponse(post, body, "Error creating session. Status: "));
            }
            jsonResponse = body.string();
        }
        final String fuid = (String) Jackson.JSON_MAPPER.readValue(jsonResponse, Map.class).get("fuid");
        logger.debug("Successfully retrieved token {}", fuid);
        return fuid;
    }

    private static void uploadFile(File file, OkHttpClient httpClient, String token) throws IOException {
        final String url = UFILE_UP_API_PATH + "/upload/chunk";
        logger.debug("Sending upload POST to {}", url);
        final Response post = httpClient.newCall(new Request.Builder()
                .url(url)
                .method("POST",
                        new MultipartBody.Builder()
                                .setType(MultipartBody.FORM)
                                .addFormDataPart("chunk_index", "1")
                                .addFormDataPart("fuid", token)
                                .addFormDataPart("file", "nzbhydra2-debug-infos.zip", RequestBody.create(null, file))
                                .build()
                )
                .build()).execute();
        if (!post.isSuccessful()) {
            throw new IOException(createErrorFromResponse(post, post.body(), "Error uploading chunk. Status: "));
        }
        logger.debug("Successfully uploaded file");
    }

    private static String finalize(File file, OkHttpClient httpClient, String token) throws IOException {
        final String url = UFILE_UP_API_PATH + "/upload/finalise";
        logger.debug("Sending finalise POST to {}", url);
        final Response post = httpClient.newCall(new Request.Builder()
                .url(url)
                .method("POST",
                        new FormBody.Builder()
                                .add("fuid", token)
                                .add("file_name", "nzbhydra2-debug-infos.zip")
                                .add("file_type", "zip")
                                .add("total_chunks", "1")
                                .build()
                )
                .build()).execute();
        try (ResponseBody body = post.body()) {
            if (!post.isSuccessful()) {
                throw new IOException(createErrorFromResponse(post, body, "Error finalising upload. Status: "));
            }
            logger.debug("Successfully finalized upload");
            return body.string();
        }
    }

    private static String createErrorFromResponse(Response post, ResponseBody body, String prefix) throws IOException {
        String message = prefix + post.code();
        if (post.message() != null) {
            message += ". Message: " + post.message();
        }
        if (post.body() != null) {
            final String bodyString = post.body().string();
            message += ". Body: " + StringUtils.abbreviate(bodyString, 500);
            post.body().close();
        }
        logger.error(message);
        return message;
    }
}
