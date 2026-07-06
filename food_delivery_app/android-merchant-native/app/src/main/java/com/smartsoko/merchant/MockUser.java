package com.smartsoko.merchant;

public class MockUser {
    private String uid;
    private String email;
    private String displayName;

    public MockUser(String uid, String email, String displayName) {
        this.uid = uid;
        this.email = email;
        this.displayName = displayName;
    }

    public String getUid() {
        return uid;
    }

    public String getEmail() {
        return email;
    }

    public String getDisplayName() {
        return displayName;
    }
}
