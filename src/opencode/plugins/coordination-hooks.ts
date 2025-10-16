// @ts-nocheck
import type { Plugin } from '@opencode-ai/plugin';

export const CoordinationHooksPlugin: Plugin = async () => {
  return {
    event: (input) => {
      input.event;
    },
    /**
     * Modify parameters sent to LLM - inject coordination context
     */
    'chat.params': async (input, _output) => {
      try {
        // Extract agent identifier from the message
        const agentId = extractAgentId(input.message);

        if (agentId) {
          // Get recent coordination events for this agent
          const coordinationContext = await getCoordinationContext(agentId);

          if (coordinationContext) {
            // Append coordination context to the user message
            if (typeof input.message === 'string') {
              input.message = `${coordinationContext}\n\n${input.message}`;
            } else if (input.message && typeof input.message === 'object') {
              if (input.message.content) {
                input.message.content = `${coordinationContext}\n\n${input.message.content}`;
              }
            }
            console.log(`🔗 Injected coordination context for agent: ${agentId}`);
          }
        }
      } catch (error) {
        console.error('Error injecting coordination context:', error);
      }
    },

    /**
     * Hook when a new message is received to broadcast events
     */
    'chat.message': async (_input, output) => {
      try {
        const agentId = extractAgentId(output.message);

        if (agentId && shouldBroadcastEvent(output.message)) {
          await broadcastAgentEvent(agentId, output.message);
        }
      } catch (error) {
        console.error('Error broadcasting agent event:', error);
      }
    },
  };
};

// Helper functions
function extractAgentId(message) {
  // Try to extract agent ID from various sources

  // 1. From message content (if agent identifies itself)
  if (typeof message === 'string') {
    const agentMatch = message.match(/(?:I am|This is|Agent:)\s*(\w+)/i);
    if (agentMatch) {
      return agentMatch[1];
    }
  }

  // 2. From message array (check system messages)
  if (Array.isArray(message)) {
    for (const msg of message) {
      if (msg.role === 'system' && msg.content) {
        const agentMatch = msg.content.match(/agent[:\s]+(\w+)/i);
        if (agentMatch) {
          return agentMatch[1];
        }

        // Check for agent file references
        const fileMatch = msg.content.match(/(?:core|sdd)\/(\w+)\.md/i);
        if (fileMatch) {
          return fileMatch[1];
        }
      }
    }
  }

  // 3. From message object
  if (message && typeof message === 'object') {
    if (message.content) {
      const agentMatch = message.content.match(/(?:I am|This is|Agent:)\s*(\w+)/i);
      if (agentMatch) {
        return agentMatch[1];
      }
    }
  }

  // 4. Try to infer from current working directory or context
  return inferAgentFromContext();
}

async function getCoordinationContext(agentId) {
  try {
    // Get recent coordination events for this agent
    const recentEvents = await getRecentEventsForAgent(agentId);

    if (recentEvents.length === 0) {
      return null;
    }

    // Format events as context
    const contextLines = recentEvents.map((event) => {
      const timestamp = new Date(event.timestamp).toLocaleTimeString();
      const source = event.source;
      const target = event.target ? ` → ${event.target}` : '';
      const data = JSON.stringify(event.data);

      return `[${timestamp}] ${source}${target}: ${data}`;
    });

    return `🔗 Recent Coordination Events for ${agentId}:\n${contextLines.join('\n')}\n---`;
  } catch (error) {
    console.error('Error getting coordination context:', error);
    return null;
  }
}

function getRecentEventsForAgent(agentId: string, maxAge = 300000) {
  // Get events from the last 5 minutes for this agent
  const _cutoff = Date.now() - maxAge;

  // This would integrate with the actual event coordination system
  // For now, return empty array - in real implementation this would:
  // 1. Check memory store for recent events
  // 2. Filter by agent (source or target)
  // 3. Filter by age
  // 4. Return formatted events

  // Placeholder implementation
  return [
    {
      id: 'evt_sample',
      type: 'agent.status',
      source: 'planner',
      target: agentId,
      data: { status: 'ready', task: 'coordination setup' },
      timestamp: Date.now() - 60000,
      namespace: 'coordination',
    },
  ];
}

function inferAgentFromContext() {
  // Try to determine current agent from environment or context
  try {
    const cwd = process.cwd();

    // Check if we're in a specific agent directory
    if (cwd.includes('/core/') || cwd.includes('\\core\\')) {
      const agentMatch = cwd.match(/(?:core|sdd)[\\/\\](\w+)/);
      if (agentMatch) {
        return agentMatch[1];
      }
    }

    if (cwd.includes('/sdd/') || cwd.includes('\\sdd\\')) {
      const agentMatch = cwd.match(/(?:core|sdd)[\\/\\](\w+)/);
      if (agentMatch) {
        return agentMatch[1];
      }
    }
  } catch (_error) {
    // Ignore errors
  }

  return null;
}

function shouldBroadcastEvent(response) {
  // Determine if this response should be broadcast as an event
  if (!response) {
    return false;
  }

  const responseText =
    typeof response === 'string'
      ? response
      : response.content || response.text || JSON.stringify(response);

  // Broadcast if response indicates completion or status change
  return (
    responseText &&
    (responseText.includes('✅') ||
      responseText.includes('complete') ||
      responseText.includes('finished') ||
      responseText.includes('status') ||
      responseText.includes('❌') ||
      responseText.includes('error') ||
      responseText.includes('ready') ||
      responseText.includes('implementing') ||
      responseText.includes('analyzing'))
  );
}

async function broadcastAgentEvent(agentId: string, message: { content?: string; text?: string; [key: string]: unknown }): Promise<void> {
  try {
    const eventData = {
      message: message,
      timestamp: Date.now(),
    };

    // Determine event type based on the message
    let eventType = 'agent.message';
    const responseText =
      typeof message === 'string'
        ? message
        : message?.content || message?.text || JSON.stringify(message);

    if (responseText.includes('✅') || responseText.includes('complete')) {
      eventType = 'task.completed';
    } else if (responseText.includes('❌') || responseText.includes('error')) {
      eventType = 'task.failed';
    } else if (responseText.includes('status') || responseText.includes('ready')) {
      eventType = 'status.changed';
    }

    // Publish the event
    publishEvent({
      type: eventType,
      source: agentId,
      data: eventData,
      namespace: 'coordination',
    });

    console.log(`🔗 Broadcast event: ${eventType} from ${agentId}`);
  } catch (error) {
    console.error('Error broadcasting agent event:', error);
  }
}

function publishEvent(event: { type: string; source: string; namespace: string; timestamp: number }): void {
  // This would integrate with the event coordination system
  // For now, just log the event
  console.log('📡 Event published:', {
    type: event.type,
    source: event.source,
    namespace: event.namespace,
    timestamp: event.timestamp,
  });
}
