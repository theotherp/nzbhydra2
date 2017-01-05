public class RunHsqlServer {

    public static void main(String[] args) {
        org.hsqldb.Server.main(new String[]{"-database.0", "file:nzbhydra", "-dbname.0", "xdb"});
    }
}
