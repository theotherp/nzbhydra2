

package org.nzbhydra.github.mavenreleaseplugin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.hash.HashCode;
import com.google.common.hash.Hashing;
import com.google.common.io.Files;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

import java.io.File;
import java.io.IOException;
import java.util.HashSet;
import java.util.Set;


@SuppressWarnings("unchecked")
@Mojo(name = "generate-wrapper-hashes",
        inheritByDefault = false,
        aggregator = true //Only call for parent POM
)
public class WrapperHashesGeneratorMojo extends AbstractMojo {

    @Parameter(property = "wrapperFile1", required = true)
    protected File wrapperFile1;
    @Parameter(property = "wrapperFile2", required = true)
    protected File wrapperFile2;
    @Parameter(property = "wrapperFile3", required = true)
    protected File wrapperFile3;
    @Parameter(property = "wrapperFile4")
    protected File wrapperFile4;
    @Parameter(property = "wrapperFile5")
    protected File wrapperFile5;
    @Parameter(property = "wrapperFile6")
    protected File wrapperFile6;
    @Parameter(property = "wrapperHashesJsonFile", required = true)
    protected File wrapperHashesJsonFile;


    private ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void execute() throws MojoExecutionException {
        checkWrapperFilesExist(wrapperFile1);
        checkWrapperFilesExist(wrapperFile2);
        checkWrapperFilesExist(wrapperFile3);
        checkWrapperFilesExist(wrapperFile4);
        checkWrapperFilesExist(wrapperFile5);
        checkWrapperFilesExist(wrapperFile6);
        getLog().info("Will write hashes to " + wrapperHashesJsonFile.getAbsolutePath());

        Set<String> hashes = new HashSet<>();
        try {
            hashFile(hashes, wrapperFile1);
            hashFile(hashes, wrapperFile2);
            hashFile(hashes, wrapperFile3);
            hashFile(hashes, wrapperFile4);
            hashFile(hashes, wrapperFile5);
            hashFile(hashes, wrapperFile6);
            Files.write(objectMapper.writeValueAsBytes(hashes), wrapperHashesJsonFile);
        } catch (IOException e) {
            throw new MojoExecutionException("Error while hashing wrapper file", e);
        }
    }

    private void hashFile(Set<String> filenamesToHashCodes, File file) throws IOException {
        if (file == null || !file.exists()) {
            return;
        }
        HashCode hash = Files.hash(file, Hashing.sha1());
        filenamesToHashCodes.add(hash.toString());
    }

    private void checkWrapperFilesExist(File wrapperFile1) throws MojoExecutionException {
        if (wrapperFile1 != null && !wrapperFile1.exists()) {
            throw new MojoExecutionException("Wrapper file does not exist: " + wrapperFile1.getAbsolutePath());
        }
    }


}
