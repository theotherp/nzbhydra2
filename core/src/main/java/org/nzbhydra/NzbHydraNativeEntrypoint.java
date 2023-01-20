/*
 *  (C) Copyright 2022 TheOtherP (theotherp@posteo.net)
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

import org.springframework.boot.SpringApplicationAotProcessor;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.aot.AbstractAotProcessor;
import org.springframework.javapoet.ClassName;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

import java.nio.file.Paths;
import java.util.Arrays;

@Configuration(proxyBeanMethods = false)
public class NzbHydraNativeEntrypoint {

    public static void main(String[] args) throws Exception {
        int requiredArgs = 6;
        Assert.isTrue(args.length >= requiredArgs, () -> "Usage: " + SpringApplicationAotProcessor.class.getName()
            + " <applicationName> <sourceOutput> <resourceOutput> <classOutput> <groupId> <artifactId> <originalArgs...>");
        Class<?> application = Class.forName(args[0]);
        AbstractAotProcessor.Settings settings = AbstractAotProcessor.Settings.builder().sourceOutput(Paths.get(args[1])).resourceOutput(Paths.get(args[2]))
            .classOutput(Paths.get(args[3])).groupId((StringUtils.hasText(args[4])) ? args[4] : "unspecified")
            .artifactId(args[5]).build();
        String[] applicationArgs = (args.length > requiredArgs) ? Arrays.copyOfRange(args, requiredArgs, args.length)
            : new String[0];
        final SpringApplicationAotProcessor processor = new SpringApplicationAotProcessor(application, settings, applicationArgs);
        final ClassName process = processor.process();
        System.exit(0);
    }

}
