package org.nzbhydra.wrapper;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.PrintWriter;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

public class Wrapper {

    public static void main(String[] args) throws FileNotFoundException {
        //TODO Provide work folder in args
        //Use xmx/xms etc settings as configured
        //Actually do the update...
        //Test on ubuntu
        //Test with spaces in paths

        try (PrintWriter out = new PrintWriter("hydraWrapper.log")) {
            try {
                boolean doStart = true;
                while (doStart) {
                    File rootDir = new File("c:\\temp\\hydra2wrappertest\\");
                    List<String> newArgs = new ArrayList<>();
                    newArgs.add("java");
                    newArgs.add("-Xmx128m");
                    newArgs.add("-Xss256k");
                    newArgs.add("-jar");
                    newArgs.add("core-0.0.1-SNAPSHOT.jar");

                    String[] hydraArgs = newArgs.toArray(new String[newArgs.size()]);
                    System.out.println("Starting new instance of Hydra using " + String.join(" ", hydraArgs));
                    out.println("Starting new instance of Hydra using " + String.join(" ", hydraArgs));
                    Process process = new ProcessBuilder(newArgs).directory(rootDir).inheritIO().directory(rootDir).start();
                    int returnCode = process.waitFor();
                    System.out.println("Return code: " + returnCode);
                    if (returnCode == 1) {
                        System.out.println("Updating");
                        File updateFolder = new File(rootDir, "update");
                        assert updateFolder.exists();
                        File[] filesInUpdateFolder = updateFolder.listFiles();
                        assert filesInUpdateFolder != null && filesInUpdateFolder.length == 1;
                        File updateZip = filesInUpdateFolder[0];
                        System.out.println("Extract all files from " + updateZip + " to " + Paths.get(""));
                        //Delete all static files beforehand
                        //Unzip to core folder, if updater is contained in ZIP then skip it. Updating the updater isn't something that will be easy or even possible
                        doStart = true;
                    } else {
                        doStart = false;
                    }
                }
            } catch (Exception e) {
                System.out.println(e.getMessage());
                out.println(e.getMessage());
            }
        }
    }

}
