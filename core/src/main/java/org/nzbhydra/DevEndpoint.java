/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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

import org.nzbhydra.externaltools.AddRequest;
import org.nzbhydra.externaltools.ExternalTools;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.math.BigInteger;
import java.util.List;

@SuppressWarnings("unchecked")
@RestController
public class DevEndpoint {

    @PersistenceContext
    private EntityManager entityManager;
    @Autowired
    private ExternalTools xdarr;

    private static final Logger logger = LoggerFactory.getLogger(DevEndpoint.class);

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/dev/countDanglingIndexersearches", method = RequestMethod.GET)
    public BigInteger countDanglingIndexersearches() throws Exception {
        final List<BigInteger> resultList = entityManager.createNativeQuery("select count(*) from SEARCHRESULT x where x.INDEXERSEARCHENTITY not in (select y.id from INDEXERSEARCH y)").getResultList();
        return resultList.get(0);

    }

    @Secured({"ROLE_ADMIN"})
    @Transactional
    @RequestMapping(value = "/dev/deleteDanglingIndexersearches", method = RequestMethod.GET)
    public String deleteDanglingIndexersearches() throws Exception {
        return "Deleted " + entityManager.createNativeQuery("delete from SEARCHRESULT where INDEXERSEARCHENTITY not in (select y.id from INDEXERSEARCH y)").executeUpdate() + " entries";
    }

    @RequestMapping(value = "/dev/testAddToSonarr", method = RequestMethod.GET)
    public String testAddToSonarr() throws Exception {
        final AddRequest addRequest = new AddRequest();
        addRequest.setAddTorrent(false);
        addRequest.setAddUsenet(false);
        addRequest.setXdarrHost("http://localhost:9191");
        addRequest.setXdarrApiKey("51b42e76e902445d8ed3f068d698914a");
        addRequest.setNzbhydraHost("http://127.0.0.1:5076");

        xdarr.addNzbhydraAsIndexer(addRequest);

        return "OK";
    }


}
