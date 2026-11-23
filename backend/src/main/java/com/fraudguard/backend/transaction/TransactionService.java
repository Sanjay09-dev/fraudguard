package com.fraudguard.backend.transaction;

import com.fraudguard.backend.account.AccountRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Optional;

@Service
public class TransactionService {

    public record Result(Transaction transaction, boolean created) {}

    private final TransactionRepository txns;
    private final AccountRepository accounts;

    public TransactionService(TransactionRepository txns, AccountRepository accounts) {
        this.txns = txns;
        this.accounts = accounts;
    }

    public Result submit(String key, Long accountId, String merchant, BigDecimal amount,
                         String currency, String country, String deviceId) {

        Optional<Transaction> existing = txns.findByIdempotencyKey(key);
        if (existing.isPresent()) {
            return replay(existing.get(), accountId, amount);
        }
        if (!accounts.existsById(accountId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found");
        }

        Transaction t = new Transaction(accountId, key, merchant, amount, currency, country, deviceId,
                Decision.APPROVE, "No fraud rules configured yet");
        try {
            return new Result(txns.save(t), true);
        } catch (DataIntegrityViolationException e) {
            // Two identical requests raced; the other one won. Return its result.
            Transaction winner = txns.findByIdempotencyKey(key).orElseThrow(() -> e);
            return replay(winner, accountId, amount);
        }
    }

    private Result replay(Transaction saved, Long accountId, BigDecimal amount) {
        boolean sameRequest = saved.getAccountId().equals(accountId)
                && saved.getAmount().compareTo(amount) == 0;
        if (!sameRequest) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Idempotency key was already used with a different request");
        }
        return new Result(saved, false);
    }
}