package org.nzbhydra.externalapi;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springdoc.core.models.GroupedOpenApi;
import org.springdoc.core.properties.SpringDocConfigProperties;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * The swagger documentation is deliberately limited to the two APIs that are meant for other programs: the
 * Newznab/Torznab API under {@code /api}, {@code /rss} and {@code /torznab/api}, and the external API under
 * {@code /externalapi}. Everything else the application maps ({@code /internalapi}, the actuator, the download
 * routes, the login page) is an implementation detail of the web interface and must not show up in the swagger UI
 * or in {@code /v3/api-docs}.
 *
 * <p>Two things enforce that: the two {@link GroupedOpenApi} beans below, which are what the UI's selector offers,
 * and {@code springdoc.packages-to-scan} in {@code config/application.properties}, which limits the default
 * document to the controllers of those two packages.
 *
 * <p>That global {@code packages-to-scan} is applied to the grouped documents as well, not only to the default one:
 * springdoc consults a group's own package list only when the global one is empty
 * ({@code AbstractOpenApiResource.isPackageToScan}). The two public groups are unaffected because everything they
 * match lives in the scanned packages, but a group for anything outside them — the {@code internal} group below —
 * would come out empty, which is why the property has to be cleared for it.
 *
 * <p>The exception is {@code core/openapi.json}, the file the React app's types are generated from: it needs the
 * internal endpoints. Starting with {@code -Dnzbhydra.dev.exposeInternalApiDocs=true} lifts the package restriction
 * and adds an {@code internal} group, so the file can be regenerated. The property defaults to false and is never
 * set in a release.
 */
@Configuration(proxyBeanMethods = false)
public class ExternalApiConfiguration {

    public static final String GROUP_NAME = "externalapi";
    public static final String NEWZNAB_GROUP_NAME = "newznab";
    public static final String INTERNAL_GROUP_NAME = "internal";
    public static final String SECURITY_SCHEME_NAME = "apiKey";
    public static final String EXPOSE_INTERNAL_API_DOCS_PROPERTY = "nzbhydra.dev.exposeInternalApiDocs";

    /**
     * Every path {@code org.nzbhydra.api} maps: {@code ExternalApi} answers {@code /api}, {@code /rss},
     * {@code /torznab/api} and the indexer specific variants of the latter two, {@code ExternalApiStats} answers
     * {@code /api/stats*} and {@code /api/history/*}. {@code ExternalApiConfigurationTest} scans the package and
     * fails when a mapping is added that none of these patterns covers.
     */
    public static final List<String> NEWZNAB_PATHS = List.of(
            "/api", "/api/**",
            "/rss", "/rss/**",
            "/torznab/api", "/torznab/api/**");

    public static final List<String> EXTERNAL_API_PATHS = List.of(ExternalApiKeyFilter.PATH_PATTERN);

    public static final List<String> INTERNAL_API_PATHS = List.of("/internalapi/**");

    /**
     * The controller packages the default document is limited to. Kept here so the test can compare it with what
     * {@code application.properties} configures.
     */
    public static final List<String> DOCUMENTED_PACKAGES = List.of("org.nzbhydra.api", "org.nzbhydra.externalapi");

    /**
     * Declares the scheme the controller's {@code @SecurityRequirement} refers to. Without it a document would carry a
     * security requirement pointing at a scheme it never defines.
     *
     * <p>Registered as a bean for the default document ({@code /v3/api-docs}, which is what {@code core/openapi.json}
     * is generated from) and handed to every group below by hand: springdoc 3.1.0 does not pass plain
     * {@link OpenApiCustomizer} beans on to grouped documents, so a group only gets what its own builder was given.
     */
    @Bean
    public OpenApiCustomizer externalApiSecuritySchemeCustomizer() {
        return securitySchemeCustomizer();
    }

    private static OpenApiCustomizer securitySchemeCustomizer() {
        return openApi -> {
            if (openApi.getComponents() == null) {
                openApi.setComponents(new Components());
            }
            openApi.getComponents().addSecuritySchemes(SECURITY_SCHEME_NAME, new SecurityScheme()
                    .type(SecurityScheme.Type.APIKEY)
                    .in(SecurityScheme.In.HEADER)
                    .name(ExternalApiKeyFilter.API_KEY_HEADER)
                    .description("The API key from the main configuration (main.apiKey). It may also be passed as the "
                            + "apikey query parameter."));
        };
    }

    @Bean
    public GroupedOpenApi externalApiGroupedOpenApi() {
        return GroupedOpenApi.builder()
                .group(GROUP_NAME)
                .pathsToMatch(EXTERNAL_API_PATHS.toArray(new String[0]))
                .addOpenApiCustomizer(securitySchemeCustomizer())
                .addOpenApiCustomizer(openApi -> openApi.info(new Info()
                        .title("NZBHydra2 external API")
                        .version("v1")
                        .description("""
                                A stable, documented API for automation and dashboards: statistics, history, the \
                                current log file and backups. Authenticate with the configured API key, either in \
                                the X-Api-Key header or as the apikey query parameter. A missing or wrong key is \
                                answered with an empty 404, the same as an unknown path.

                                The Newznab API under /api is unaffected and keeps its own specification.""")))
                .build();
    }

    /**
     * The API Sonarr, Radarr and NZB clients call. It has its own specification, so this group is mostly a way of
     * seeing which paths the instance answers and with which parameters.
     */
    @Bean
    public GroupedOpenApi newznabGroupedOpenApi() {
        return GroupedOpenApi.builder()
                .group(NEWZNAB_GROUP_NAME)
                .pathsToMatch(NEWZNAB_PATHS.toArray(new String[0]))
                .addOpenApiCustomizer(securitySchemeCustomizer())
                .addOpenApiCustomizer(onlyGetAndPostCustomizer())
                .addOpenApiCustomizer(openApi -> openApi.info(new Info()
                        .title("NZBHydra2 Newznab/Torznab API")
                        .version("v1")
                        .description("""
                                The Newznab and Torznab API that download clients such as Sonarr, Radarr, Lidarr \
                                and Readarr use, plus the JSON stats and history endpoints under /api. \
                                Authenticate with the apikey query parameter.

                                This API follows the Newznab specification \
                                (https://newznab.readthedocs.io/en/latest/misc/api/), which, not this document, \
                                defines the semantics of the parameters and of the returned XML or JSON. New \
                                integrations that want statistics or history should use the external API under \
                                /externalapi instead of /api/stats.""")))
                .build();
    }

    /**
     * The Newznab controllers map their routes with a bare {@code @RequestMapping}, which means every HTTP method,
     * so springdoc emits seven operations per path. Only GET and POST are ever used, and nine paths times seven
     * verbs make the group unreadable, so the rest is dropped from the document. Nothing about the mappings
     * themselves changes: the application keeps answering exactly what it answered before.
     */
    static OpenApiCustomizer onlyGetAndPostCustomizer() {
        return openApi -> {
            if (openApi.getPaths() == null) {
                return;
            }
            for (PathItem pathItem : openApi.getPaths().values()) {
                pathItem.setPut(null);
                pathItem.setDelete(null);
                pathItem.setOptions(null);
                pathItem.setHead(null);
                pathItem.setPatch(null);
                pathItem.setTrace(null);
            }
        };
    }

    /**
     * Only exists when {@link #EXPOSE_INTERNAL_API_DOCS_PROPERTY} is set, which is a development aid for
     * regenerating {@code core/openapi.json}. The internal API is not a public interface and is not documented for
     * users.
     */
    @Bean
    @ConditionalOnProperty(name = EXPOSE_INTERNAL_API_DOCS_PROPERTY, havingValue = "true")
    public GroupedOpenApi internalApiGroupedOpenApi() {
        return GroupedOpenApi.builder()
                .group(INTERNAL_GROUP_NAME)
                .pathsToMatch(INTERNAL_API_PATHS.toArray(new String[0]))
                .addOpenApiCustomizer(securitySchemeCustomizer())
                .addOpenApiCustomizer(openApi -> openApi.info(new Info()
                        .title("NZBHydra2 internal API")
                        .version("dev")
                        .description("What the web interface talks to. Not a public interface: it changes between "
                                + "releases without notice. Only shown because "
                                + EXPOSE_INTERNAL_API_DOCS_PROPERTY + " is set.")))
                .build();
    }

    /**
     * Removes the {@code springdoc.packages-to-scan} restriction from {@code application.properties} so that the
     * default document contains every path again, which is what {@code core/openapi.json} and the React types need,
     * and so that the {@code internal} group is not filtered down to nothing: springdoc applies the global package
     * list to grouped documents too and falls back to a group's own list only when the global one is empty.
     */
    @Bean
    @ConditionalOnProperty(name = EXPOSE_INTERNAL_API_DOCS_PROPERTY, havingValue = "true")
    public InitializingBean internalApiDocsUnrestrictor(SpringDocConfigProperties springDocConfigProperties) {
        return () -> springDocConfigProperties.setPackagesToScan(List.of());
    }
}
