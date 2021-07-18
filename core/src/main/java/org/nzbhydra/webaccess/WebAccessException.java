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

import java.io.IOException;

public class WebAccessException extends IOException {

    private String message;
    private String body;
    private int code;

    public WebAccessException(Exception e) {
        super(e);
        this.message = e.getMessage();
    }

    public WebAccessException(String errorMessage) {
        super(errorMessage);
        this.message = errorMessage;
    }

    public WebAccessException(String responseMessage, String body, int code) {
        this.message = responseMessage;
        this.body = body;
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public String getBody() {
        return body;
    }

    public int getCode() {
        return code;
    }
}
