package com.fraudguard.backend.alert;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    public record ResolveRequest(@NotNull AlertStatus status) {}

    private final AlertService service;

    public AlertController(AlertService service) {
        this.service = service;
    }

    @GetMapping
    public List<AlertResponse> list(@RequestParam(required = false) AlertStatus status,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "20") int size) {
        return service.list(status, page, size);
    }

    @PatchMapping("/{id}/resolve")
    public AlertResponse resolve(@PathVariable Long id,
                                 @Valid @RequestBody ResolveRequest req,
                                 Authentication auth) {
        return service.resolve(id, req.status(), auth.getName());
    }
}