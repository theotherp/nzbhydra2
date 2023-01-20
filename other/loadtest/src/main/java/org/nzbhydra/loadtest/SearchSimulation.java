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

package org.nzbhydra.loadtest;

import io.gatling.javaapi.core.PopulationBuilder;
import io.gatling.javaapi.core.ScenarioBuilder;
import io.gatling.javaapi.core.Simulation;

import java.util.Random;

import static io.gatling.javaapi.core.CoreDsl.constantUsersPerSec;
import static io.gatling.javaapi.core.CoreDsl.scenario;
import static io.gatling.javaapi.http.HttpDsl.http;

public class SearchSimulation extends Simulation {


    {

//        final OpenInjectionStep.ConstantRate.ConstantRateOpenInjectionStep openInjectionStep = constantUsersPerSec(1000).during(10);
//        final PopulationBuilder populationBuilder = kafkaScenario.injectOpen(openInjectionStep);
//        setUp(populationBuilder).protocols(() -> kafkaProtocol.build());


    }

    public SearchSimulation() {
        final ScenarioBuilder scenarioBuilder = scenario("loadtest")
            .exec(http("search")
                .get("http://127.0.0.1:5076/api?apikey=apikey&t=search&q=" + new Random().nextInt()));

        final PopulationBuilder populationBuilder = scenarioBuilder.injectOpen(

            constantUsersPerSec(50).during(15)
        );


        final SetUp setUp = setUp(populationBuilder);
    }
}
