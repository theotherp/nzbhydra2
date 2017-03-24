import java.io.File;
import java.io.FileNotFoundException;
import java.io.PrintWriter;
import java.util.Arrays;

public class Updater {

    public static void main(String[] args) throws FileNotFoundException {
        try (PrintWriter out = new PrintWriter("hydraUpdater.log")) {
            try {
                if (args == null || args.length == 0) {
                    System.out.println("No args provided");
                    out.close();
                    return;
                }
                String hydraPidFile = args[0];
                System.out.println("Started with argument " + hydraPidFile);
                out.println("Started with argument " + hydraPidFile);
                File file = new File(hydraPidFile);
                while (file.exists()) {
                    Thread.sleep(1000);
                    System.out.println("Waiting for file " + hydraPidFile + " to not exist anymore");
                    out.println("Waiting for file " + hydraPidFile + " to not exist anymore");
                }
                System.out.println("File " + hydraPidFile + " doesn't exist anymore, Hydra seems to be shut down");
                out.println("File " + hydraPidFile + " doesn't exist anymore, Hydra seems to be shut down");
                System.out.println("Updating in some way");
                out.println("Updating in some way");
                String[] hydraArgs = Arrays.copyOfRange(args, 1, args.length);
                System.out.println("Starting new instance of Hydra using " + String.join(" ", hydraArgs));
                out.println("Starting new instance of Hydra using " + String.join(" ", hydraArgs));
                Process process = Runtime.getRuntime().exec(hydraArgs, null, new File("c:\\Users\\strat\\IdeaProjects\\NzbHydra2\\core\\"));
                if (process.isAlive()) {
                    out.println("Successfully started NZBHydra");
                } else {
                    out.println("NZBHydra process is not alive, probably an error occurred");
                }

            } catch (Exception e) {
                System.out.println(e.getMessage());
                out.println(e.getMessage());
            }
        }
    }

}
