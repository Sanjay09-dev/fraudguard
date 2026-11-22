package com.fraudguard.backend.auth;

import com.fraudguard.backend.user.Role;

public record UserResponse(Long id, String username, String email, Role role) {}