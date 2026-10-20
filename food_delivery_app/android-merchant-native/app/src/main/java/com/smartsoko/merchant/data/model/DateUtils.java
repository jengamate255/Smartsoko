package com.smartsoko.merchant.data.model;

import com.google.firebase.Timestamp;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public final class DateUtils {

    private DateUtils() {}

    public static Date toDate(Object value) {
        if (value == null) return null;
        if (value instanceof Date) return (Date) value;
        if (value instanceof Timestamp) return ((Timestamp) value).toDate();
        if (value instanceof Number) {
            long n = ((Number) value).longValue();
            // treat plausible epoch-seconds values as seconds
            return new Date(n < 10_000_000_000L ? n * 1000 : n);
        }
        String s = value.toString().trim();
        if (s.isEmpty()) return null;
        String[] patterns = {
                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                "yyyy-MM-dd'T'HH:mm:ss'Z'",
                "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
                "yyyy-MM-dd'T'HH:mm:ss",
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd"
        };
        for (String pattern : patterns) {
            try {
                SimpleDateFormat f = new SimpleDateFormat(pattern, Locale.US);
                f.setTimeZone(TimeZone.getTimeZone("UTC"));
                return f.parse(s);
            } catch (Exception ignored) {
            }
        }
        return null;
    }
}
