package com.fraudguard.backend.ml;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class MlClient {

    private static final Logger log = LoggerFactory.getLogger(MlClient.class);

    public record MlResult(BigDecimal score, BigDecimal probability) {}

    private final RestClient client;
    private final int failureThreshold;
    private final long cooldownMillis;
    private final AtomicInteger failures = new AtomicInteger();
    private volatile long openUntil = 0L;

    public MlClient(@Value("${ml.base-url}") String baseUrl,
                    @Value("${ml.connect-timeout-ms}") long connectMs,
                    @Value("${ml.read-timeout-ms}") long readMs,
                    @Value("${ml.failure-threshold}") int failureThreshold,
                    @Value("${ml.cooldown-seconds}") long cooldownSeconds) {
        HttpClient http = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofMillis(connectMs))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(Duration.ofMillis(readMs));
        this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
        this.failureThreshold = failureThreshold;
        this.cooldownMillis = cooldownSeconds * 1000;
    }

    /** Returns the ML result, or empty if there are no features or the service is unavailable. */
    public Optional<MlResult> score(Map<String, Double> features) {
        if (features == null || features.isEmpty()) {
            return Optional.empty();
        }
        if (System.currentTimeMillis() < openUntil) {
            return Optional.empty();   // circuit open: skip the call, use rules only
        }
        try {
            Map<String, Object> body = client.post()
                    .uri("/predict")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("features", features))
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            Object s = body == null ? null : body.get("score");
            Object p = body == null ? null : body.get("fraud_probability");
            if (!(s instanceof Number) || !(p instanceof Number)) {
                throw new IllegalStateException("Unexpected ML response: " + body);
            }
            failures.set(0);
            return Optional.of(new MlResult(
                    BigDecimal.valueOf(((Number) s).doubleValue()).setScale(4, RoundingMode.HALF_UP),
                    BigDecimal.valueOf(((Number) p).doubleValue()).setScale(4, RoundingMode.HALF_UP)));

        } catch (HttpClientErrorException e) {
            // 4xx means our input was rejected. That is not an outage, so it doesn't trip the breaker.
            log.warn("ML service rejected the input: {}", e.getStatusCode());
            return Optional.empty();
        } catch (RuntimeException e) {
            int n = failures.incrementAndGet();
            log.warn("ML service call failed ({} in a row): {}", n, e.toString());
            if (n >= failureThreshold) {
                openUntil = System.currentTimeMillis() + cooldownMillis;
                failures.set(0);
                log.warn("ML circuit open for {} ms: using rules only", cooldownMillis);
            }
            return Optional.empty();
        }
    }
}