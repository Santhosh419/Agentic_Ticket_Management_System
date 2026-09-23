package com.intellidesk.agent.resolution;

/**
 * Result returned by a specialized AI Ticket Resolver agent.
 */
public record AgentResolutionResult(
        boolean success,
        String resolutionNote,
        String agentName
) {}
