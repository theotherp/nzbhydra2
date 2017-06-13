package org.nzbhydra.wrapper;

import sun.misc.URLClassPath;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLClassLoader;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

public class NzbHydraWrapper {

    private static URLClassLoader classLoader;
    private static int state = 1;
    private static Lock lock = new ReentrantLock();
    private static final Condition condition;

    static {
        condition = lock.newCondition();
    }

    public static void main(String[] args) throws ClassNotFoundException, NoSuchMethodException, MalformedURLException, InvocationTargetException, IllegalAccessException {
        while (state == 1) {
            addJarsToClassLoader();
            startHydra();
            lock.lock();
            try {
                condition.await();
            } catch (InterruptedException e) {
                e.printStackTrace();
            } finally {
                lock.unlock();
            }

        }

        //TODO: When restarting for update make sure to update dependencies and the new JAR by calling addJarsToClassLoader() or sth like that

    }

    protected static void addJarsToClassLoader() throws NoSuchMethodException, IllegalAccessException, InvocationTargetException, MalformedURLException {
        classLoader = (URLClassLoader) ClassLoader.getSystemClassLoader();

        Method addUrlMethod = URLClassLoader.class.getDeclaredMethod("addURL", URL.class);
        addUrlMethod.setAccessible(true);


        File[] dependencies = new File("..\\dependencies\\").listFiles();
        for (File dependency : dependencies) {
            addUrlMethod.invoke(classLoader, dependency.toURI().toURL());
        }
        addUrlMethod.invoke(classLoader, new File("..\\..\\core\\target\\core-0.0.1-SNAPSHOT.jar").toURI().toURL());

        try {
            //Update the class loader with a new URLClassPath because it was closed before and won't open them otherwise, resulting in ClassNotFoundExceptions
            Field ucp = URLClassLoader.class.getDeclaredField("ucp");
            ucp.setAccessible(true);
            ucp.set(classLoader, new URLClassPath(classLoader.getURLs()));

        } catch (NoSuchFieldException e) {
            e.printStackTrace();
        }
        classLoader.clearAssertionStatus();

    }


    private static void startHydra() throws IllegalAccessException, InvocationTargetException, NoSuchMethodException, ClassNotFoundException {
        classLoader.loadClass("org.nzbhydra.NzbHydra").getDeclaredMethod("start", URLClassLoader.class).invoke(null, classLoader);
    }

    //Called by main process
    public static void doShutdown() throws IllegalAccessException, InvocationTargetException, NoSuchMethodException, ClassNotFoundException {
        System.out.println("Shutting down");
        classLoader.loadClass("org.nzbhydra.NzbHydra").getDeclaredMethod("close").invoke(null);
        state = 0;
        condition.signal();
    }

    //Called by main process
    public static void doRestart() throws IllegalAccessException, InvocationTargetException, NoSuchMethodException, ClassNotFoundException {
        System.out.println("Restarting");
        classLoader.loadClass("org.nzbhydra.NzbHydra").getDeclaredMethod("close").invoke(null);
        try {
            classLoader.close();
        } catch (IOException e) {
            e.printStackTrace();
        }

        lock.lock();
        try {
            condition.signalAll();
        } finally {
            lock.unlock();
        }

    }


}
