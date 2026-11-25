package com.fraudguard.backend.ml;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class MlClientTest {

    private static final String OK_BODY =
            "{\"fraud_probability\":0.9321,\"score\":0.9023,\"threshold\":0.6524,\"model_version\":\"xgb-1\"}";
    private static final Map<String, Double> FEATURES = Map.of("V1", 0.1, "Amount", 25.0);

    private HttpServer server;
    private final AtomicInteger requests = new AtomicInteger();
    private volatile int status = 200;
    private volatile String body = OK_BODY;
    private volatile long delayMs = 0;

    @BeforeEach
    void startFakeMlService() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);   // port 0 = any free port
        server.createContext("/predict", exchange -> {
            requests.incrementAndGet();
            try {
                if (delayMs > 0) Thread.sleep(delayMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, bytes.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(bytes);
            }
        });
        server.start();
    }

    @AfterEach
    void stopFakeMlService() {
        server.stop(0);
    }

    /** Failure threshold 3, cool-down 30 seconds, like the real settings. */
    private MlClient client(long readTimeoutMs) {
        return new MlClient("http://127.0.0.1:" + server.getAddress().getPort(), 200, readTimeoutMs, 3, 30);
    }

    @Test
    void returnsTheScoreFromTheMlService() {
        Optional<MlClient.MlResult> result = client(500).score(FEATURES);
        assertThat(result).isPresent();
        assertThat(result.get().score()).isEqualByComparingTo("0.9023");
        assertThat(result.get().probability()).isEqualByComparingTo("0.9321");
    }

    @Test
    void skipsTheCallWhenNoFeaturesAreGiven() {
        MlClient client = client(500);
        assertThat(client.score(null)).isEmpty();
        assertThat(client.score(Map.of())).isEmpty();
        assertThat(requests.get()).isZero();
    }

    @Test
    void fallsBackWhenTheServiceReturnsAnError() {
        status = 500;
        body = "{}";
        assertThat(client(500).score(FEATURES)).isEmpty();
    }

    @Test
    void fallsBackWhenTheServiceIsTooSlow() {
        delayMs = 800;
        assertThat(client(200).score(FEATURES)).isEmpty();
    }

    @Test
    void fallsBackWhenTheResponseHasTheWrongShape() {
        body = "{\"unexpected\":true}";
        assertThat(client(500).score(FEATURES)).isEmpty();
    }

    @Test
    void opensTheCircuitAfterRepeatedFailures() {
        status = 500;
        body = "{}";
        MlClient client = client(500);
        for (int i = 0; i < 3; i++) {
            assertThat(client.score(FEATURES)).isEmpty();
        }
        assertThat(requests.get()).isEqualTo(3);

        status = 200;          // the service recovers, but the circuit stays open for the cool-down
        body = OK_BODY;
        assertThat(client.score(FEATURES)).isEmpty();
        assertThat(requests.get()).isEqualTo(3);   // proof that no new request was sent
    }

    @Test
    void rejectedInputDoesNotOpenTheCircuit() {
        status = 422;
        body = "{\"detail\":\"Missing features\"}";
        MlClient client = client(500);
        for (int i = 0; i < 5; i++) {
            assertThat(client.score(FEATURES)).isEmpty();
        }
        status = 200;
        body = OK_BODY;
        assertThat(client.score(FEATURES)).isPresent();
    }
}