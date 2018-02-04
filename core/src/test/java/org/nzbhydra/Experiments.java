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

import okhttp3.Call;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import org.junit.Ignore;
import org.junit.Test;

import java.io.IOException;

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

}
