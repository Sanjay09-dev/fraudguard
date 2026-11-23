package com.fraudguard.backend.auth;

public record LoginResponse(String token, String tokenType) {}