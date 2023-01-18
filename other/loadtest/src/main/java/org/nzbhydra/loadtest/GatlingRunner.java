package org.nzbhydra.loadtest;

import io.gatling.app.Gatling;
import io.gatling.core.config.GatlingPropertiesBuilder;
import scala.collection.mutable.Map;

public class GatlingRunner {

    public static void main(String[] args) {

        final Map<String, Object> gatlingProperties = new GatlingPropertiesBuilder()
            .simulationClass(SearchSimulation.class.getName())
            .build();

        Gatling.fromMap(gatlingProperties);

    }
}
