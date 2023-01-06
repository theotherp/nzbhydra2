/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.historystats.stats;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.DayOfWeek;
import java.time.format.TextStyle;
import java.util.Locale;

@Data
@ReflectionMarker
public class CountPerDayOfWeek {
    private String day = null;
    private Integer count = null;

    /**
     * @param dayIndex 1 for "Mon", 2 for "Tue", etc.
     */
    public CountPerDayOfWeek(int dayIndex, Integer counter) {
        this.count = counter;
        day = DayOfWeek.of(dayIndex).getDisplayName(TextStyle.SHORT, Locale.US);
    }

    public CountPerDayOfWeek() {
    }
}
