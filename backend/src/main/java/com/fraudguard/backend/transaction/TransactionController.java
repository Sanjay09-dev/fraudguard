package com.fraudguard.backend.transaction;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    public record CreateRequest(
            @NotNull Long accountId,
            @NotBlank @Size(max = 100) String merchant,
            @NotNull @DecimalMin("0.01") @Digits(integer = 12, fraction = 2) BigDecimal amount,
            @NotBlank @Pattern(regexp = "[A-Z]{3}") String currency,
            @NotBlank @Pattern(regexp = "[A-Z]{2}") String country,
            @Size(max = 64) String deviceId) {}

    public record TransactionResponse(Long id, Long accountId, String merchant, BigDecimal amount,
                                      String currency, String country, String deviceId,
                                      Decision decision, String reason, Instant createdAt) {}

    private final TransactionService service;
    private final TransactionRepository txns;

    public TransactionController(TransactionService service, TransactionRepository txns) {
        this.service = service;
        this.txns = txns;
    }

    @PostMapping
    public ResponseEntity<TransactionResponse> create(
            @RequestHeader("Idempotency-Key") @NotBlank @Size(max = 64) String key,
            @Valid @RequestBody CreateRequest req) {

        TransactionService.Result result = service.submit(key, req.accountId(), req.merchant(),
                req.amount(), req.currency(), req.country(), req.deviceId());

        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(toResponse(result.transaction()));
    }

    @GetMapping
    public List<TransactionResponse> list(@RequestParam(required = false) Long accountId,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "20") int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        List<Transaction> rows = (accountId == null)
                ? txns.findAll(PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt")))
                      .getContent()
                : txns.findByAccountIdOrderByCreatedAtDesc(accountId, PageRequest.of(safePage, safeSize));

        return rows.stream().map(this::toResponse).toList();
    }

    private TransactionResponse toResponse(Transaction t) {
        return new TransactionResponse(t.getId(), t.getAccountId(), t.getMerchant(), t.getAmount(),
                t.getCurrency(), t.getCountry(), t.getDeviceId(), t.getDecision(),
                t.getDecisionReason(), t.getCreatedAt());
    }
}