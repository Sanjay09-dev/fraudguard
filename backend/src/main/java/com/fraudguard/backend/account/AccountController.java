package com.fraudguard.backend.account;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    public record CreateRequest(
            @NotBlank @Pattern(regexp = "[A-Za-z0-9]{6,20}") String accountNumber,
            @NotBlank @Size(max = 100) String holderName,
            @NotBlank @Pattern(regexp = "[A-Z]{2}") String homeCountry) {}

    public record AccountResponse(Long id, String accountNumber, String holderName, String homeCountry) {}

    private final AccountRepository accounts;

    public AccountController(AccountRepository accounts) {
        this.accounts = accounts;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AccountResponse create(@Valid @RequestBody CreateRequest req) {
        if (accounts.existsByAccountNumber(req.accountNumber())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Account number already exists");
        }
        Account a = accounts.save(new Account(req.accountNumber(), req.holderName(), req.homeCountry()));
        return toResponse(a);
    }

    @GetMapping
    public List<AccountResponse> list(@RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "20") int size) {
        PageRequest p = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        return accounts.findAll(p).getContent().stream().map(this::toResponse).toList();
    }

    private AccountResponse toResponse(Account a) {
        return new AccountResponse(a.getId(), a.getAccountNumber(), a.getHolderName(), a.getHomeCountry());
    }
}