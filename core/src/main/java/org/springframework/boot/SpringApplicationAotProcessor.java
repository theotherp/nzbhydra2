/*
The original from Spring Boot does not return for some reason.
 */

package org.springframework.boot;

import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.aot.ContextAotProcessor;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.util.Assert;
import org.springframework.util.ReflectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.util.function.ThrowingSupplier;

import java.lang.reflect.Method;
import java.nio.file.Paths;
import java.util.Arrays;

public class SpringApplicationAotProcessor extends ContextAotProcessor {

    private final String[] applicationArgs;

    /**
     * Create a new processor for the specified application and settings.
     * @param application the application main class
     * @param settings the general AOT processor settings
     * @param applicationArgs the arguments to provide to the main method
     */
    public SpringApplicationAotProcessor(Class<?> application, Settings settings, String[] applicationArgs) {
        super(application, settings);
        this.applicationArgs = applicationArgs;
    }

    @Override
    protected GenericApplicationContext prepareApplicationContext(Class<?> application) {
        return new AotProcessorHook(application).run(() -> {
            Method mainMethod = application.getMethod("main", String[].class);
            return ReflectionUtils.invokeMethod(mainMethod, null, new Object[] { this.applicationArgs });
        });
    }

    public static void main(String[] args) throws Exception {
        System.out.println("Using My org.springframework.boot.SpringApplicationAotProcessor");
        int requiredArgs = 6;
        Assert.isTrue(args.length >= requiredArgs, () -> "Usage: " + SpringApplicationAotProcessor.class.getName()
            + " <applicationName> <sourceOutput> <resourceOutput> <classOutput> <groupId> <artifactId> <originalArgs...>");
        Class<?> application = Class.forName(args[0]);
        Settings settings = Settings.builder().sourceOutput(Paths.get(args[1])).resourceOutput(Paths.get(args[2]))
            .classOutput(Paths.get(args[3])).groupId((StringUtils.hasText(args[4])) ? args[4] : "unspecified")
            .artifactId(args[5]).build();
        String[] applicationArgs = (args.length > requiredArgs) ? Arrays.copyOfRange(args, requiredArgs, args.length)
            : new String[0];
        new SpringApplicationAotProcessor(application, settings, applicationArgs).process();

        //Only difference to original
        System.exit(0);
    }

    /**
     * {@link SpringApplicationHook} used to capture the {@link ApplicationContext} and
     * trigger early exit of main method.
     */
    private static final class AotProcessorHook implements SpringApplicationHook {

        private final Class<?> application;

        private AotProcessorHook(Class<?> application) {
            this.application = application;
        }

        @Override
        public SpringApplicationRunListener getRunListener(SpringApplication application) {
            return new SpringApplicationRunListener() {

                @Override
                public void contextLoaded(ConfigurableApplicationContext context) {
                    throw new SpringApplication.AbandonedRunException(context);
                }

            };
        }

        private <T> GenericApplicationContext run(ThrowingSupplier<T> action) {
            try {
                SpringApplication.withHook(this, action);
            }
            catch (SpringApplication.AbandonedRunException ex) {
                ApplicationContext context = ex.getApplicationContext();
                Assert.isInstanceOf(GenericApplicationContext.class, context,
                    () -> "AOT processing requires a GenericApplicationContext but got a "
                        + context.getClass().getName());
                return (GenericApplicationContext) context;
            }
            throw new IllegalStateException(
                "No application context available after calling main method of '%s'. Does it run a SpringApplication?"
                    .formatted(this.application.getName()));
        }

    }

}

