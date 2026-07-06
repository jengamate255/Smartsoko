package com.smartsoko.merchant;

public class MockAuth {
    private static MockAuth instance;
    private MockUser currentUser;

    private MockAuth() {
        // Mock user for testing - auto logged in
        currentUser = new MockUser("demo-merchant", "merchant@smartsoko.com", "Demo Restaurant");
    }

    public static synchronized MockAuth getInstance() {
        if (instance == null) {
            instance = new MockAuth();
        }
        return instance;
    }

    public MockUser getCurrentUser() {
        return currentUser;
    }

    public void signOut() {
        currentUser = null;
    }

    public void signIn(String email, String password) {
        currentUser = new MockUser("demo-merchant", email, "Demo Restaurant");
    }
}
