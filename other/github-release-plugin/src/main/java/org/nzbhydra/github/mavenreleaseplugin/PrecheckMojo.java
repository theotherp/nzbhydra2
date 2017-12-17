package org.nzbhydra.github.mavenreleaseplugin;

import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;


@SuppressWarnings("unchecked")
@Mojo(name = "precheck",
        requiresOnline = true, //Obviously
        inheritByDefault = false,
        aggregator = true //Only call for parent POM
)
public class PrecheckMojo extends ReleaseMojo {

    @Override
    public void execute() throws MojoExecutionException {
        getChangelogVersionEntry(); //Throws an exception of not oK
        executePrechecks();
    }

}
