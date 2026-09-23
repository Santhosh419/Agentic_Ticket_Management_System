package com.intellidesk.classification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.intellidesk.classification.domain.Sentiment;
import com.intellidesk.ticket.domain.TicketPriority;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * AI-assisted ticket classification via an external Make.com (Integromat) webhook scenario.
 *
 * <p>Activated when {@code intellidesk.classification.provider=make}. Sends ticket
 * text to a Make.com Custom Webhook endpoint, which runs scenario / AI agent
 * logic and returns structured classification data. If Make.com is unreachable,
 * rate-limited, or times out, the calling service layer ({@code TicketService.classifySafely})
 * catches the exception and falls back to default classification seamlessly.</p>
 */
@Service
@ConditionalOnProperty(name = "intellidesk.classification.provider", havingValue = "make")
public class MakeTicketClassificationService implements TicketClassificationService {

    private static final Logger log = LoggerFactory.getLogger(MakeTicketClassificationService.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String webhookUrl;

    public record MakeRequest(String title, String description) {}

    public record MakeResponse(
            String categoryCode,
            TicketPriority priority,
            Sentiment sentiment,
            String suggestedResponse,
            Boolean autoResolve
    ) {}

    public MakeTicketClassificationService(
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            @Value("${intellidesk.classification.make.webhook-url:https://hook.us1.make.com/your-custom-webhook-id}") String webhookUrl) {
        this.webhookUrl = webhookUrl;
        this.objectMapper = objectMapper;
        this.restClient = restClientBuilder.build();
    }

    @Override
    public TicketClassification classify(String title, String description) {
        log.info("Sending ticket to Make.com AI webhook endpoint '{}'", webhookUrl);
        
        MakeRequest requestPayload = new MakeRequest(title, description);

        try {
            // Retrieve response as raw String to support both application/json and text/plain headers from Make.com
            String rawResponseBody = restClient.post()
                    .uri(webhookUrl)
                    .body(requestPayload)
                    .retrieve()
                    .body(String.class);

            if (rawResponseBody == null || rawResponseBody.isBlank()) {
                throw new IllegalStateException("Make.com webhook returned empty body");
            }

            // Parse JSON body using Jackson ObjectMapper
            MakeResponse response = objectMapper.readValue(rawResponseBody, MakeResponse.class);

            String categoryCode = response.categoryCode() != null ? response.categoryCode().toUpperCase() : "OTHER";
            TicketPriority priority = response.priority() != null ? response.priority() : TicketPriority.MEDIUM;
            Sentiment sentiment = response.sentiment() != null ? response.sentiment() : Sentiment.NEUTRAL;
            boolean autoResolve = Boolean.TRUE.equals(response.autoResolve());

            log.info("Make.com classification received: category={}, priority={}, sentiment={}, autoResolve={}",
                    categoryCode, priority, sentiment, autoResolve);

            return new TicketClassification(categoryCode, priority, sentiment, response.suggestedResponse(), autoResolve);

        } catch (Exception e) {
            log.error("Failed to classify ticket via Make.com webhook: {}", e.getMessage());
            throw new RuntimeException("Make.com classification service failed: " + e.getMessage(), e);
        }
    }
}
