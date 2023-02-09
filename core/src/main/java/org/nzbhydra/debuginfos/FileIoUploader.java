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

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.util.Strings;
import org.nzbhydra.Jackson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public class FileIoUploader {

    private static final Logger logger = LoggerFactory.getLogger(FileIoUploader.class);

    public static String upload(File file) throws IOException {
        final OkHttpClient httpClient = new OkHttpClient();

        logger.info("Starting upload of debug infos file {}", file);


        final String json = uploadFile(file, httpClient);

        final String url = URLDecoder.decode((String) Jackson.JSON_MAPPER.readValue(json, Map.class).get("link"), StandardCharsets.UTF_8);

        logger.info("Uploaded debug infos to {}", url);

        return url;
    }


    private static String uploadFile(File file, OkHttpClient httpClient) throws IOException {
        final String url = "https://file.io/";
        logger.debug("Sending upload POST to {}", url);
        final Response post = httpClient.newCall(new Request.Builder()
            .url(url)
            .method("POST",
                new MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("chunk_index", "1")
                    .addFormDataPart("autoDelete", "true")
                    .addFormDataPart("file", "nzbhydra2-debug-infos.zip", RequestBody.create(file, MediaType.parse("application/octet-stream")))
                    .build()
            )
            .build()).execute();
        if (!post.isSuccessful()) {
            throw new IOException(createErrorFromResponse(post, post.body(), "Error uploading chunk. Status: "));
        }
        logger.debug("Successfully uploaded file");
        return post.body().string();
    }


    private static String createErrorFromResponse(Response post, ResponseBody body, String prefix) throws IOException {
        String message = prefix + post.code();
        if (Strings.isNotEmpty(post.message())) {
            message += ". Message: " + post.message();
        }
        if (post.body() != null) {
            final String bodyString = post.body().string();
            if (Strings.isNotEmpty(bodyString)) {
                message += ". Body:\n" + StringUtils.abbreviate(bodyString, 500);
            }
            post.body().close();
        }
        logger.error(message);
        return message;
    }
}
