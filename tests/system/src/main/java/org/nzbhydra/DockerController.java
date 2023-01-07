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

package org.nzbhydra;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.model.Bind;
import com.github.dockerjava.api.model.Container;
import com.github.dockerjava.api.model.ExposedPort;
import com.github.dockerjava.api.model.HostConfig;
import com.github.dockerjava.api.model.PortBinding;
import com.github.dockerjava.api.model.Ports;
import com.github.dockerjava.api.model.Volume;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientBuilder;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.SystemUtils;
import org.awaitility.Awaitility;
import org.junit.platform.commons.logging.Logger;
import org.junit.platform.commons.logging.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.File;
import java.time.Duration;
import java.util.Collections;
import java.util.List;

@Component
public class DockerController {

    private static final Logger logger = LoggerFactory.getLogger(DockerController.class);
    private static final String DOCKER_DATA_FOLDER = "/data";
    private static final int HYDRA_PORT = 5076;


    @Value("${docker.host}")
    private String dockerHost;
    @Value("${nzbhydra.port}")
    private int nzbhydraPort;


    public void initializeContainer(String dataFolderToUse, String sourceDataFolder, String containerName, int localPort) throws Exception {
        File systemModuleFolder = new File(DockerController.class.getProtectionDomain().getCodeSource().getLocation().toURI()).getParentFile().getParentFile();
        final File targetDataFolder = new File(dataFolderToUse);
        if (targetDataFolder.exists()) {
            logger.info(() -> "Deleting target data folder " + targetDataFolder);
            FileUtils.deleteDirectory(targetDataFolder);
        }
        FileUtils.copyDirectory(new File(systemModuleFolder, "instanceData/" + sourceDataFolder), targetDataFolder);

        final DefaultDockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder()
            .withDockerHost(dockerHost)
            .build();
        try (DockerClient client = getClient()) {
            killAndRemoveContainer(containerName);

            client.pullImageCmd("ghcr.io/theotherp/hydradocker:latest").start().awaitCompletion();
            final String targetFolderForDocker = (SystemUtils.IS_OS_WINDOWS ? "/mnt" : "") + targetDataFolder.getAbsolutePath().replace("\\", "/").replace("C:", "/c");
            final ExposedPort exposedPort = ExposedPort.tcp(HYDRA_PORT);
            client
                .createContainerCmd("ghcr.io/theotherp/hydradocker:latest")
                .withEnv("spring_profiles_active=build,systemtest")
                .withExposedPorts(exposedPort)
                .withHostConfig(new HostConfig()
                    .withPortBindings(new PortBinding(Ports.Binding.bindPort(localPort), exposedPort))
                    .withBinds(new Bind(targetFolderForDocker, new Volume(DOCKER_DATA_FOLDER))))
                .withName(containerName).exec();
            logger.info(() -> "Starting container " + containerName);
            client.startContainerCmd(containerName).exec();
            Awaitility.await()
                .atMost(Duration.ofSeconds(20))
                .pollInterval(Duration.ofSeconds(1))
                .until(() -> client.listContainersCmd().withNameFilter(Collections.singletonList(containerName)).exec().stream().anyMatch(x -> x.getStatus().contains("healthy")));

            logger.info(() -> "Started container " + containerName + " binding " + targetFolderForDocker + ":" + DOCKER_DATA_FOLDER + " and " + localPort + ":" + HYDRA_PORT);

        }
    }

    public void killAndRemoveContainer(String containerName) throws Exception {
        try (DockerClient client = getClient()) {
            final List<Container> existingContainers = client.listContainersCmd()
                .withShowAll(true)
                .withNameFilter(Collections.singletonList(containerName)).exec();
            for (Container container : existingContainers) {
                if ("running".equals(container.getState())) {
                    logger.info(() -> "Killing container " + containerName);
                    client.killContainerCmd(containerName).exec();
                }
                logger.info(() -> "Removing container " + containerName);
                client.removeContainerCmd(containerName).exec();
            }
        }
    }

    private DockerClient getClient() {
        return DockerClientBuilder.getInstance(DefaultDockerClientConfig.createDefaultConfigBuilder()
            .withDockerHost(dockerHost)
            .build()).build();
    }
}
