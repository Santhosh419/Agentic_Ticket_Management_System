package com.intellidesk.classification;

import com.intellidesk.classification.domain.Sentiment;
import com.intellidesk.ticket.domain.TicketPriority;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * AI-assisted ticket classification via an external n8n webhook workflow.
 *
 * <p>Activated when {@code intellidesk.classification.provider=n8n}. Sends ticket
 * text to an n8n webhook endpoint, which runs LLM / agent logic and returns
 * structured classification data. If n8n is unreachable or times out, the
 * calling service layer ({@code TicketService.classifySafely}) catches the
 * exception and falls back to default classification seamlessly.</p>
 */
@Service
@ConditionalOnProperty(name = "intellidesk.classification.provider", havingValue = "n8n")
public class N8nTicketClassificationService implements TicketClassificationService {

    private static final Logger log = LoggerFactory.getLogger(N8nTicketClassificationService.class);

    private final RestClient restClient;
    private final String webhookUrl;

    public record N8nRequest(String title, String description) {}

    public record N8nResponse(
            String categoryCode,
            TicketPriority priority,
            Sentiment sentiment,
            String suggestedResponse,
            Boolean autoResolve
    ) {}

    public N8nTicketClassificationService(
            RestClient.Builder restClientBuilder,
            @Value("${intellidesk.classification.n8n.webhook-url:http://localhost:5678/webhook/intellidesk-classify}") String webhookUrl) {
        this.webhookUrl = webhookUrl;
        this.restClient = restClientBuilder.build();
    }

    @Override
    public TicketClassification classify(String title, String description) {
        log.info("Sending ticket to n8n AI webhook endpoint '{}'", webhookUrl);
        
        N8nRequest requestPayload = new N8nRequest(title, description);

        try {
            N8nResponse response = restClient.post()
                    .uri(webhookUrl)
                    .body(requestPayload)
                    .retrieve()
                    .body(N8nResponse.class);

            if (response == null) {
                throw new IllegalStateException("n8n webhook returned empty body");
            }

            String categoryCode = response.categoryCode() != null ? response.categoryCode().toUpperCase() : "OTHER";
            TicketPriority priority = response.priority() != null ? response.priority() : TicketPriority.MEDIUM;
            Sentiment sentiment = response.sentiment() != null ? response.sentiment() : Sentiment.NEUTRAL;
            boolean autoResolve = Boolean.TRUE.equals(response.autoResolve());

            log.info("n8n classification received: category={}, priority={}, sentiment={}, autoResolve={}",
                    categoryCode, priority, sentiment, autoResolve);

            return new TicketClassification(categoryCode, priority, sentiment, response.suggestedResponse(), autoResolve);

        } catch (Exception e) {
            log.error("Failed to classify ticket via n8n webhook: {}", e.getMessage());
            throw new RuntimeException("n8n classification service failed: " + e.getMessage(), e);
        }
    }
}
