import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Logger utility
const Logger = {
  info: (message: string) => console.error(`[INFO] ${message}`),
  success: (message: string) => console.error(`[SUCCESS] ${message}`),
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`);
    if (error) {
      console.error(error);
    }
  },
};

// Helper function to validate IANA timezone
function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

// Helper function to validate time format (HH:MM)
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

// Get current time in a specific timezone
function getCurrentTime(args: { timezone: string }): CallToolResult {
  try {
    const { timezone } = args;

    // Validate timezone
    if (!isValidTimezone(timezone)) {
      return {
        content: [
          {
            type: 'text',
            text: `✗ Invalid timezone: ${timezone}. Please use a valid IANA timezone name (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo').`,
          },
        ],
        isError: true,
      };
    }

    // Get current time in specified timezone
    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'long',
      hour12: false,
    });

    const parts = timeFormatter.formatToParts(now);
    const formatObject: Record<string, string> = {};
    for (const part of parts) {
      formatObject[part.type] = part.value;
    }

    const time24 = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);

    const isoString = now.toLocaleString('sv-SE', { timeZone: timezone });

    Logger.info(`Retrieved current time for timezone: ${timezone}`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              timezone,
              current_time: {
                date: `${formatObject.month} ${formatObject.day}, ${formatObject.year}`,
                time_24h: time24,
                time_with_seconds: timeFormatter.format(now),
                timezone_name: formatObject.timeZoneName,
                iso_format: `${isoString.replace(' ', 'T')}Z`,
                unix_timestamp: Math.floor(now.getTime() / 1000),
              },
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error('Error getting current time', error);
    return {
      content: [
        {
          type: 'text',
          text: `✗ Error getting current time: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

// Convert time between timezones
function convertTime(args: {
  source_timezone: string;
  time: string;
  target_timezone: string;
}): CallToolResult {
  try {
    const { source_timezone, time, target_timezone } = args;

    // Validate timezones
    if (!isValidTimezone(source_timezone)) {
      return {
        content: [
          {
            type: 'text',
            text: `✗ Invalid source timezone: ${source_timezone}. Please use a valid IANA timezone name.`,
          },
        ],
        isError: true,
      };
    }

    if (!isValidTimezone(target_timezone)) {
      return {
        content: [
          {
            type: 'text',
            text: `✗ Invalid target timezone: ${target_timezone}. Please use a valid IANA timezone name.`,
          },
        ],
        isError: true,
      };
    }

    // Validate time format
    if (!isValidTimeFormat(time)) {
      return {
        content: [
          {
            type: 'text',
            text: `✗ Invalid time format: ${time}. Please use 24-hour format (HH:MM).`,
          },
        ],
        isError: true,
      };
    }

    // Parse the time and create a date object for today in source timezone
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();

    // Create a date object representing the time in source timezone
    const sourceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

    // Format the source time to get the correct representation
    const sourceFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: source_timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const sourceParts = sourceFormatter.formatToParts(sourceDate);
    const sourceFormatObject: Record<string, string> = {};
    for (const part of sourceParts) {
      sourceFormatObject[part.type] = part.value;
    }

    // Convert to target timezone
    const targetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: target_timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'long',
      hour12: false,
    });

    const targetTime24 = new Intl.DateTimeFormat('en-US', {
      timeZone: target_timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(sourceDate);

    const targetParts = targetFormatter.formatToParts(sourceDate);
    const targetFormatObject: Record<string, string> = {};
    for (const part of targetParts) {
      targetFormatObject[part.type] = part.value;
    }

    const targetDate = new Date(sourceDate.toLocaleString('en-US', { timeZone: target_timezone }));
    const timeDiffMs = targetDate.getTime() - sourceDate.getTime();
    const timeDiffHours = Math.round(timeDiffMs / (1000 * 60 * 60));

    Logger.info(`Converted time from ${source_timezone} to ${target_timezone}`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              conversion: {
                source: {
                  timezone: source_timezone,
                  time: time,
                  formatted: sourceFormatter.format(sourceDate),
                },
                target: {
                  timezone: target_timezone,
                  time_24h: targetTime24,
                  formatted: targetFormatter.format(sourceDate),
                  date: `${targetFormatObject.month} ${targetFormatObject.day}, ${targetFormatObject.year}`,
                  timezone_name: targetFormatObject.timeZoneName,
                },
                time_difference_hours: timeDiffHours,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error('Error converting time', error);
    return {
      content: [
        {
          type: 'text',
          text: `✗ Error converting time: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

// Register all time tools
export function registerTimeTools(server: McpServer) {
  server.registerTool(
    'get_current_time',
    {
      description: 'Get current time in a specific timezone or system timezone',
      inputSchema: {
        timezone: z
          .string()
          .describe("IANA timezone name (e.g., 'America/New_York', 'Europe/London')"),
      },
    },
    getCurrentTime
  );

  server.registerTool(
    'convert_time',
    {
      description: 'Convert time between timezones',
      inputSchema: {
        source_timezone: z.string().describe('Source IANA timezone name'),
        time: z.string().describe('Time in 24-hour format (HH:MM)'),
        target_timezone: z.string().describe('Target IANA timezone name'),
      },
    },
    convertTime
  );
}
