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

package org.nzbhydra.historystats;

import com.google.common.io.Resources;
import org.junit.Test;
import org.nzbhydra.historystats.stats.IndexerUniquenessScore;
import org.nzbhydra.historystats.stats.StatsRequest;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.searching.uniqueness.IndexerUniquenessScoreEntity;

import java.nio.charset.Charset;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


public class StatsTest {


    @Test
    public void shouldCalculateUniquenessScore() throws Exception {
        Stats stats = new Stats();

        List<IndexerUniquenessScoreEntity> indexerUniquenessScores = new ArrayList<>();
        Map<String, IndexerEntity> indexersById = new HashMap<>();
        List<String> tsvLines = Resources.readLines(Resources.getResource(StatsTest.class, "uniquenessFromServer.tsv"), Charset.defaultCharset());

        for (String tsvLine : tsvLines) {
            String[] values = tsvLine.split("\t");
            indexersById.putIfAbsent(values[1], new IndexerEntity(values[1]));
            indexerUniquenessScores.add(new IndexerUniquenessScoreEntity(indexersById.get(values[1]), Integer.parseInt(values[2]), Integer.parseInt(values[3]), Boolean.parseBoolean(values[4])));
        }


        StatsRequest statsRequest = new StatsRequest(Instant.now().minus(10, ChronoUnit.DAYS), Instant.now().plus(10, ChronoUnit.DAYS), true);
        statsRequest.setAvgIndexerUniquenessScore(true);
        List<IndexerUniquenessScore> result = stats.calculateUniquenessScore(indexersById.keySet(), indexerUniquenessScores);
        System.out.println();
    }

}
