package org.nzbhydra.searching;

import org.nzbhydra.database.SearchResultEntity;

import java.nio.charset.Charset;

public class SearchResultIdCalculator {

    public static long calculateSearchResultId(SearchResultEntity result) {
        return hash64((result.getIndexer().getName() + result.getIndexerGuid()));
    }

    public static long calculateSearchResultId(SearchResultItem result) {
        return hash64((result.getIndexer().getName() + result.getIndexerGuid()));
    }


    //Following part is taken from https://github.com/tnm/murmurhash-java

    /**
     * Generates 64 bit hash from byte array of the given length and seed.
     *
     * @param data   byte array to hash
     * @param length length of the array to hash
     * @param seed   initial seed value
     * @return 64 bit hash of the given array
     */
    private static long hash64(final byte[] data, int length, int seed) {
        final long m = 0xc6a4a7935bd1e995L;
        final int r = 47;

        long h = (seed & 0xffffffffl) ^ (length * m);

        int length8 = length / 8;

        for (int i = 0; i < length8; i++) {
            final int i8 = i * 8;
            long k = ((long) data[i8 + 0] & 0xff) + (((long) data[i8 + 1] & 0xff) << 8)
                    + (((long) data[i8 + 2] & 0xff) << 16) + (((long) data[i8 + 3] & 0xff) << 24)
                    + (((long) data[i8 + 4] & 0xff) << 32) + (((long) data[i8 + 5] & 0xff) << 40)
                    + (((long) data[i8 + 6] & 0xff) << 48) + (((long) data[i8 + 7] & 0xff) << 56);

            k *= m;
            k ^= k >>> r;
            k *= m;

            h ^= k;
            h *= m;
        }

        switch (length % 8) {
            case 7:
                h ^= (long) (data[(length & ~7) + 6] & 0xff) << 48;
            case 6:
                h ^= (long) (data[(length & ~7) + 5] & 0xff) << 40;
            case 5:
                h ^= (long) (data[(length & ~7) + 4] & 0xff) << 32;
            case 4:
                h ^= (long) (data[(length & ~7) + 3] & 0xff) << 24;
            case 3:
                h ^= (long) (data[(length & ~7) + 2] & 0xff) << 16;
            case 2:
                h ^= (long) (data[(length & ~7) + 1] & 0xff) << 8;
            case 1:
                h ^= (long) (data[length & ~7] & 0xff);
                h *= m;
        }
        ;

        h ^= h >>> r;
        h *= m;
        h ^= h >>> r;

        return h;
    }

    /**
     * Generates 64 bit hash from byte array with default seed value.
     *
     * @param data   byte array to hash
     * @param length length of the array to hash
     * @return 64 bit hash of the given string
     */
    public static long hash64(final byte[] data, int length) {
        return hash64(data, length, 0xe17a1465);
    }

    /**
     * Generates 64 bit hash from a string.
     *
     * @param text string to hash
     * @return 64 bit hash of the given string
     */
    public static long hash64(final String text) {
        final byte[] bytes = text.getBytes(Charset.defaultCharset());
        return hash64(bytes, bytes.length);
    }

}
