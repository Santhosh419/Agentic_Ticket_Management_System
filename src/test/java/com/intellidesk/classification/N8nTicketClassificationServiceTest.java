package com.intellidesk.classification;

import com.intellidesk.classification.domain.Sentiment;
import com.intellidesk.ticket.domain.TicketPriority;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class N8nTicketClassificationServiceTest {

    private static final String WEBHOOK_URL = "http://localhost:5678/webhook/intellidesk-classify";

    private MockRestServiceServer mockServer;
    private N8nTicketClassificationService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        service = new N8nTicketClassificationService(builder, WEBHOOK_URL);
    }

    @Test
    void classify_successfulN8nResponse() {
        String mockResponseJson = """
            {
                "categoryCode": "PAYMENT",
                "priority": "HIGH",
                "sentiment": "NEGATIVE",
                "suggestedResponse": "We apologize. A refund request #123 has been logged."
            }
            """;

        mockServer.expect(requestTo(WEBHOOK_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(mockResponseJson, MediaType.APPLICATION_JSON));

        TicketClassification result = service.classify("Payment failed", "Money was deducted from account");

        mockServer.verify();
        assertThat(result.categoryCode()).isEqualTo("PAYMENT");
        assertThat(result.priority()).isEqualTo(TicketPriority.HIGH);
        assertThat(result.sentiment()).isEqualTo(Sentiment.NEGATIVE);
        assertThat(result.suggestedResponse()).contains("refund request #123");
    }

    @Test
    void classify_n8nServerError_throwsException() {
        mockServer.expect(requestTo(WEBHOOK_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThatThrownBy(() -> service.classify("Technical error", "App crashes on startup"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("n8n classification service failed");

        mockServer.verify();
    }
}
