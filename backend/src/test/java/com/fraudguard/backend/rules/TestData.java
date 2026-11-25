package com.fraudguard.backend.rules;

import com.fraudguard.backend.account.Account;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;

final class TestData {

    private TestData() {}

    static Account account(long id, String homeCountry) {
        Account account = new Account("ACC" + id, "Test User", homeCountry);
        ReflectionTestUtils.setField(account, "id", id);   // ids are normally set by the database
        return account;
    }

    static RuleContext ctx(Account account, String amount, String country, String deviceId) {
        return new RuleContext(account, new BigDecimal(amount), "INR", country, deviceId, Instant.now());
    }
}