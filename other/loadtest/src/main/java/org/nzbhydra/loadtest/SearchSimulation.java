

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
