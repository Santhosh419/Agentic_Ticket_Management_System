package com.intellidesk.classification;

import com.fasterxml.jackson.databind.ObjectMapper;
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

class MakeTicketClassificationServiceTest {

    private static final String MAKE_WEBHOOK_URL = "https://hook.us1.make.com/mock-webhook-id";

    private MockRestServiceServer mockServer;
    private MakeTicketClassificationService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        service = new MakeTicketClassificationService(builder, new ObjectMapper(), MAKE_WEBHOOK_URL);
    }

    @Test
    void classify_successfulMakeResponse() {
        String mockResponseJson = """
            {
                "categoryCode": "PAYMENT",
                "priority": "HIGH",
                "sentiment": "NEGATIVE",
                "suggestedResponse": "We apologize. A refund check has been logged via Make.com agent.",
                "autoResolve": false
            }
            """;

        mockServer.expect(requestTo(MAKE_WEBHOOK_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(mockResponseJson, MediaType.APPLICATION_JSON));

        TicketClassification result = service.classify("Payment failed", "Money was deducted from account");

        mockServer.verify();
        assertThat(result.categoryCode()).isEqualTo("PAYMENT");
        assertThat(result.priority()).isEqualTo(TicketPriority.HIGH);
        assertThat(result.sentiment()).isEqualTo(Sentiment.NEGATIVE);
        assertThat(result.suggestedResponse()).contains("Make.com agent");
        assertThat(result.autoResolve()).isFalse();
    }

    @Test
    void classify_successfulMakeResponse_withAutoResolve() {
        String mockResponseJson = """
            {
                "categoryCode": "PAYMENT",
                "priority": "HIGH",
                "sentiment": "NEGATIVE",
                "suggestedResponse": "We check your payment and auto-refunded transaction #100.",
                "autoResolve": true
            }
            """;

        mockServer.expect(requestTo(MAKE_WEBHOOK_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(mockResponseJson, MediaType.APPLICATION_JSON));

        TicketClassification result = service.classify("Payment failed", "Money was deducted from account");

        mockServer.verify();
        assertThat(result.categoryCode()).isEqualTo("PAYMENT");
        assertThat(result.autoResolve()).isTrue();
    }

    @Test
    void classify_makeServerError_throwsException() {
        mockServer.expect(requestTo(MAKE_WEBHOOK_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThatThrownBy(() -> service.classify("Technical error", "App crashes on startup"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Make.com classification service failed");

        mockServer.verify();
    }
}
