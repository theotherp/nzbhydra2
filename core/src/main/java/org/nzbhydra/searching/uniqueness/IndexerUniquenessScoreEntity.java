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

package org.nzbhydra.searching.uniqueness;

import lombok.Data;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.nzbhydra.indexers.IndexerEntity;

import javax.persistence.*;


@Entity
@Data
@Table(name = "indexeruniquenessscore")
public class IndexerUniquenessScoreEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private int id;

    @ManyToOne
    @OnDelete(action = OnDeleteAction.CASCADE)
    private IndexerEntity indexer;

    @Column(name = "involved")
    private int involved;

    @Column(name = "have")
    private int have;

    @Column(name = "hasresult")
    private boolean hasResult;

    public IndexerUniquenessScoreEntity() {
    }

    public IndexerUniquenessScoreEntity(IndexerEntity indexer, int involved, int have, boolean hasResult) {
        this.indexer = indexer;
        this.involved = involved;
        this.have = have;
        this.hasResult = hasResult;
    }
}
