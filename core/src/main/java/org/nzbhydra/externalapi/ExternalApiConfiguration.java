package org.nzbhydra.externalapi;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Puts the external API into a swagger group of its own, so that the swagger UI's group selector offers it next to
 * everything else the application maps. The default document stays untouched and keeps containing every path.
 */
@Configuration(proxyBeanMethods = false)
public class ExternalApiConfiguration {

    public static final String GROUP_NAME = "externalapi";
    public static final String DEFAULT_GROUP_NAME = "all";
    public static final String SECURITY_SCHEME_NAME = "apiKey";

    /**
     * Declares the scheme the controller's {@code @SecurityRequirement} refers to. Without it a document would carry a
     * security requirement pointing at a scheme it never defines.
     *
     * <p>Registered as a bean for the default document ({@code /v3/api-docs}, which is what {@code core/openapi.json}
     * is generated from) and handed to both groups below by hand: springdoc 3.1.0 does not pass plain
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
                .pathsToMatch(ExternalApiKeyFilter.PATH_PATTERN)
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
     * As soon as one group exists springdoc's UI offers only groups, so without this the rest of the application
     * would disappear from the selector. {@code /v3/api-docs} keeps serving the whole document either way, which is
     * what {@code core/openapi.json} is generated from.
     */
    @Bean
    public GroupedOpenApi allPathsGroupedOpenApi() {
        return GroupedOpenApi.builder()
                .group(DEFAULT_GROUP_NAME)
                .pathsToMatch("/**")
                .addOpenApiCustomizer(securitySchemeCustomizer())
                .build();
    }
}
