package org.nzbhydra.externalapi;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.Paths;
import org.junit.jupiter.api.Test;
import org.reflections.Reflections;
import org.reflections.scanners.Scanners;
import org.springdoc.core.models.GroupedOpenApi;
import org.springdoc.core.properties.SpringDocConfigProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.util.AntPathMatcher;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Properties;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Guards what the swagger UI and {@code /v3/api-docs} show. The internal API, the actuator and everything else the
 * application maps must stay out of both unless the development property is set.
 */
class ExternalApiConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(SpringDocPropertiesConfiguration.class, ExternalApiConfiguration.class);

    /**
     * Stands in for what springdoc's own auto configuration would contribute.
     */
    @Configuration(proxyBeanMethods = false)
    static class SpringDocPropertiesConfiguration {
        @Bean
        SpringDocConfigProperties springDocConfigProperties() {
            return new SpringDocConfigProperties();
        }
    }

    @Test
    void shouldOfferOnlyTheTwoPublicGroups() {
        contextRunner.run(context -> {
            assertThat(context.getBeansOfType(GroupedOpenApi.class).values())
                    .extracting(GroupedOpenApi::getGroup)
                    .containsExactlyInAnyOrder(ExternalApiConfiguration.GROUP_NAME,
                            ExternalApiConfiguration.NEWZNAB_GROUP_NAME);

            assertThat(group(context.getBeansOfType(GroupedOpenApi.class).values(), ExternalApiConfiguration.GROUP_NAME)
                    .getPathsToMatch()).containsExactly("/externalapi/**");
            assertThat(group(context.getBeansOfType(GroupedOpenApi.class).values(), ExternalApiConfiguration.NEWZNAB_GROUP_NAME)
                    .getPathsToMatch()).containsExactlyElementsOf(ExternalApiConfiguration.NEWZNAB_PATHS);
        });
    }

    @Test
    void shouldNotOfferTheInternalGroupUnlessTheDevelopmentPropertyIsSet() {
        contextRunner.run(context -> assertThat(context.getBeansOfType(GroupedOpenApi.class).values())
                .extracting(GroupedOpenApi::getGroup)
                .doesNotContain(ExternalApiConfiguration.INTERNAL_GROUP_NAME));

        contextRunner.withPropertyValues(ExternalApiConfiguration.EXPOSE_INTERNAL_API_DOCS_PROPERTY + "=false")
                .run(context -> assertThat(context.getBeansOfType(GroupedOpenApi.class).values())
                        .extracting(GroupedOpenApi::getGroup)
                        .doesNotContain(ExternalApiConfiguration.INTERNAL_GROUP_NAME));
    }

    @Test
    void shouldOfferTheInternalGroupAndLiftThePackageRestrictionWhenTheDevelopmentPropertyIsSet() {
        contextRunner.withPropertyValues(ExternalApiConfiguration.EXPOSE_INTERNAL_API_DOCS_PROPERTY + "=true")
                .run(context -> {
                    assertThat(context.getBeansOfType(GroupedOpenApi.class).values())
                            .extracting(GroupedOpenApi::getGroup)
                            .containsExactlyInAnyOrder(ExternalApiConfiguration.GROUP_NAME,
                                    ExternalApiConfiguration.NEWZNAB_GROUP_NAME,
                                    ExternalApiConfiguration.INTERNAL_GROUP_NAME);
                    assertThat(group(context.getBeansOfType(GroupedOpenApi.class).values(),
                            ExternalApiConfiguration.INTERNAL_GROUP_NAME).getPathsToMatch())
                            .containsExactly("/internalapi/**");
                    //The bean is an InitializingBean, so getting it is enough to have it applied
                    assertThat(context.getBean(SpringDocConfigProperties.class).getPackagesToScan()).isEmpty();
                });
    }

    @Test
    void shouldRestrictTheDefaultDocumentToTheDocumentedPackages() throws Exception {
        //Not read from the classpath: the test resources carry an application.properties of their own
        Path applicationProperties = Path.of("src/main/resources/config/application.properties");
        assertThat(applicationProperties).as("the main application.properties").exists();
        Properties properties = new Properties();
        try (InputStream stream = Files.newInputStream(applicationProperties)) {
            properties.load(stream);
        }
        assertThat(properties.getProperty("springdoc.packages-to-scan"))
                .as("the default document must not contain /internalapi, /actuator and the like")
                .isEqualTo(String.join(",", ExternalApiConfiguration.DOCUMENTED_PACKAGES));
        assertThat(properties.getProperty("springdoc.paths-to-match"))
                .as("a global paths-to-match would override the groups' own patterns in springdoc")
                .isNull();
    }

    /**
     * A new mapping under {@code org.nzbhydra.api} would silently fall out of the newznab group if the group's
     * patterns did not cover it, so the package is scanned instead of listing the paths twice.
     */
    @Test
    void shouldCoverEveryMappingOfTheNewznabControllers() {
        AntPathMatcher matcher = new AntPathMatcher();
        Set<String> mappedPaths = mappedPaths("org.nzbhydra.api");

        assertThat(mappedPaths).as("no controller found, the scan is broken").isNotEmpty();
        assertThat(mappedPaths).contains("/api", "/rss", "/torznab/api", "/api/stats", "/api/history/searches");
        for (String path : mappedPaths) {
            assertThat(ExternalApiConfiguration.NEWZNAB_PATHS)
                    .as("no pattern of the newznab swagger group matches " + path)
                    .anyMatch(pattern -> matcher.match(pattern, path));
        }
    }

    @Test
    void shouldCoverEveryMappingOfTheExternalApiController() {
        AntPathMatcher matcher = new AntPathMatcher();
        for (String path : mappedPaths("org.nzbhydra.externalapi")) {
            assertThat(ExternalApiConfiguration.EXTERNAL_API_PATHS)
                    .as("no pattern of the externalapi swagger group matches " + path)
                    .anyMatch(pattern -> matcher.match(pattern, path));
        }
    }

    private static Set<String> mappedPaths(String packageName) {
        Reflections reflections = new Reflections(packageName, Scanners.TypesAnnotated);
        Set<String> paths = new LinkedHashSet<>();
        Set<Class<?>> controllers = new LinkedHashSet<>(reflections.getTypesAnnotatedWith(RestController.class));
        controllers.addAll(reflections.getTypesAnnotatedWith(Controller.class));
        for (Class<?> controller : controllers) {
            RequestMapping classMapping = AnnotatedElementUtils.findMergedAnnotation(controller, RequestMapping.class);
            List<String> prefixes = classMapping == null || classMapping.value().length == 0
                    ? List.of("")
                    : Arrays.asList(classMapping.value());
            for (Method method : controller.getDeclaredMethods()) {
                RequestMapping mapping = AnnotatedElementUtils.findMergedAnnotation(method, RequestMapping.class);
                if (mapping == null) {
                    continue;
                }
                List<String> values = mapping.value().length == 0 ? List.of("") : Arrays.asList(mapping.value());
                List<String> combined = new ArrayList<>();
                for (String prefix : prefixes) {
                    for (String value : values) {
                        combined.add(prefix + value);
                    }
                }
                paths.addAll(combined);
            }
        }
        return paths;
    }

    /**
     * The Newznab controllers map every HTTP method, which springdoc turns into seven operations per path. Only GET
     * and POST are meaningful, so the group's customizer removes the rest from the document.
     */
    @Test
    void shouldDropEverythingButGetAndPostFromTheNewznabGroup() {
        PathItem pathItem = new PathItem()
                .get(new Operation().operationId("get"))
                .post(new Operation().operationId("post"))
                .put(new Operation().operationId("put"))
                .delete(new Operation().operationId("delete"))
                .options(new Operation().operationId("options"))
                .head(new Operation().operationId("head"))
                .patch(new Operation().operationId("patch"))
                .trace(new Operation().operationId("trace"));
        OpenAPI openApi = new OpenAPI().paths(new Paths().addPathItem("/api", pathItem));

        ExternalApiConfiguration.onlyGetAndPostCustomizer().customise(openApi);

        assertThat(pathItem.readOperationsMap().keySet())
                .containsExactlyInAnyOrder(PathItem.HttpMethod.GET, PathItem.HttpMethod.POST);
        //A document without paths must not make the customizer fail
        ExternalApiConfiguration.onlyGetAndPostCustomizer().customise(new OpenAPI());
    }

    private static GroupedOpenApi group(Iterable<GroupedOpenApi> groups, String name) {
        for (GroupedOpenApi group : groups) {
            if (group.getGroup().equals(name)) {
                return group;
            }
        }
        throw new AssertionError("No swagger group named " + name);
    }
}
