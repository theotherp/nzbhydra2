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
        ChangelogVersionEntry entry = getChangelogVersionEntry();//Throws an exception if not oK
        if (entry.getDate() == null) {
            throw new MojoExecutionException("Date missing in changelog entry");
        }
        executePrechecks();
    }

}
