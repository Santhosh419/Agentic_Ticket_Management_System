package com.intellidesk.ai.agent;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for the AI / ML Resolution Agent.
 */
@ConfigurationProperties(prefix = "intellidesk.ai.llm")
public record AiResolutionProperties(
        boolean enabled,
        String provider,       // "gemini" or "openai-compatible" (OpenAI, Groq, Ollama)
        String apiKey,
        String model,
        String endpointUrl,
        int timeoutMs
) {
    public AiResolutionProperties {
        if (provider == null || provider.isBlank()) {
            provider = "openai-compatible";
        }
        if (model == null || model.isBlank()) {
            model = "gpt-4o-mini";
        }
        if (endpointUrl == null || endpointUrl.isBlank()) {
            endpointUrl = "https://api.openai.com/v1";
        }
        if (timeoutMs <= 0) {
            timeoutMs = 8000;
        }
    }
}
