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

package org.nzbhydra.mediainfo;

import com.uwetrottmann.tmdb2.Tmdb;
import com.uwetrottmann.tmdb2.entities.FindResults;
import com.uwetrottmann.tmdb2.enumerations.ExternalSource;
import org.junit.Ignore;
import org.junit.Test;
import org.mockito.InjectMocks;
import retrofit2.Call;

@Ignore
public class CustomTmdbTest {

    @InjectMocks
    private CustomTmdb testee = new CustomTmdb();

    @Test
    public void bla() {
        Tmdb tm = new Tmdb("4df99d58875c2d01fc04936759fea56f");
        Call<FindResults> findResultsCall = tm.findService().find("tt0019798", ExternalSource.IMDB_ID, null);
        System.out.println(findResultsCall);
    }

}