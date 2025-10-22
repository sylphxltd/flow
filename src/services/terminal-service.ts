import { Effect, Layer } from 'effect';
import {
  type TableOptions,
  TerminalError,
  TerminalService,
  type TerminalStyle,
} from './service-types.js';

/**
 * Simple ANSI color codes for terminal output
 */
const ANSI_CODES = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

/**
 * Apply color and style to text
 */
const styleText = (text: string, style?: TerminalStyle): string => {
  if (!style) return text;

  const codes: string[] = [];

  if (style.color) {
    const colorMap: Record<string, string> = {
      red: ANSI_CODES.red,
      green: ANSI_CODES.green,
      yellow: ANSI_CODES.yellow,
      blue: ANSI_CODES.blue,
      magenta: ANSI_CODES.magenta,
      cyan: ANSI_CODES.cyan,
      white: ANSI_CODES.white,
      gray: ANSI_CODES.gray,
    };
    if (colorMap[style.color]) {
      codes.push(colorMap[style.color]);
    }
  }

  if (style.bold) {
    codes.push(ANSI_CODES.bright);
  }

  if (codes.length === 0) return text;

  return `${codes.join('')}${text}${ANSI_CODES.reset}`;
};

/**
 * Live implementation of TerminalService using ANSI escape codes
 * This is a simplified implementation that will be enhanced with @effect/printer later
 */
export const TerminalServiceLive = Layer.succeed(
  TerminalService,
  TerminalService.of({
    print: (message: string, style?: TerminalStyle) =>
      Effect.try({
        try: () => {
          const styled = styleText(message, style);
          process.stdout.write(styled);
        },
        catch: (error) => {
          throw new TerminalError(`Failed to print to terminal: ${error}`, error as Error, 'print');
        },
      }),

    success: (message: string) =>
      Effect.try({
        try: () => {
          const styled = styleText(`✅ ${message}`, { color: 'green', bold: true });
          process.stdout.write(styled + '\n');
        },
        catch: (error) => {
          throw new TerminalError(
            `Failed to print success message: ${error}`,
            error as Error,
            'success'
          );
        },
      }),

    error: (message: string) =>
      Effect.try({
        try: () => {
          const styled = styleText(`❌ Error: ${message}`, { color: 'red', bold: true });
          process.stderr.write(styled + '\n');
        },
        catch: (error) => {
          throw new TerminalError(
            `Failed to print error message: ${error}`,
            error as Error,
            'error'
          );
        },
      }),

    warning: (message: string) =>
      Effect.try({
        try: () => {
          const styled = styleText(`⚠️  ${message}`, { color: 'yellow', bold: true });
          process.stdout.write(styled + '\n');
        },
        catch: (error) => {
          throw new TerminalError(
            `Failed to print warning message: ${error}`,
            error as Error,
            'warning'
          );
        },
      }),

    info: (message: string) =>
      Effect.try({
        try: () => {
          const styled = styleText(`ℹ️  ${message}`, { color: 'blue', bold: true });
          process.stdout.write(styled + '\n');
        },
        catch: (error) => {
          throw new TerminalError(`Failed to print info message: ${error}`, error as Error, 'info');
        },
      }),

    table: (data: unknown[], options?: TableOptions) =>
      Effect.try({
        try: () => {
          if (!Array.isArray(data) || data.length === 0) {
            const styled = styleText('No data to display', { color: 'gray' });
            process.stdout.write(styled + '\n');
            return;
          }

          const headers = options?.headers || Object.keys(data[0] as any);
          const border = options?.border !== false;
          const padding = options?.padding || 1;

          // Convert data to rows
          const rows = data.map((item) =>
            headers.map((header) => String((item as any)[header] || ''))
          );

          // Calculate column widths
          const columnWidths = headers.map((header, index) => {
            const maxContentWidth = Math.max(
              header.length,
              ...rows.map((row) => (row[index] || '').length)
            );
            return maxContentWidth + padding * 2;
          });

          // Helper to render a row
          const renderRow = (row: string[], isHeader = false): string => {
            const cells = row.map((cell, index) => {
              const width = columnWidths[index];
              const padded = cell.padStart(width - padding).padEnd(width);
              return isHeader ? styleText(padded, { bold: true }) : padded;
            });

            if (border) {
              return `│${cells.map((cell) => ` ${cell} `).join('│')}│`;
            } else {
              return cells.join('  ');
            }
          };

          const tableContent: string[] = [];

          if (border) {
            // Render borders
            const borderLine = columnWidths.map((width) => '─'.repeat(width + 2)).join('┼');
            tableContent.push(`┌${borderLine}┐`);
          }

          // Add headers
          tableContent.push(renderRow(headers, true));

          if (border) {
            const borderLine = columnWidths.map((width) => '─'.repeat(width + 2)).join('┼');
            tableContent.push(`├${borderLine}┤`);
          }

          // Add data rows
          rows.forEach((row) => {
            tableContent.push(renderRow(row));
          });

          if (border) {
            const borderLine = columnWidths.map((width) => '─'.repeat(width + 2)).join('┼');
            tableContent.push(`└${borderLine}┘`);
          }

          process.stdout.write(tableContent.join('\n') + '\n');
        },
        catch: (error) => {
          throw new TerminalError(`Failed to print table: ${error}`, error as Error, 'table');
        },
      }),

    progress: (total: number, current: number, message?: string) =>
      Effect.try({
        try: () => {
          const percentage = Math.round((current / total) * 100);
          const width = 40;
          const filled = Math.round((current / total) * width);
          const empty = width - filled;
          const bar = '█'.repeat(filled) + '░'.repeat(empty);

          const progressText = message
            ? `${message} [${bar}] ${percentage}% (${current}/${total})`
            : `[${bar}] ${percentage}% (${current}/${total})`;

          const styled = styleText(progressText, { color: 'cyan' });
          process.stdout.write('\r' + styled);

          // Add newline if complete
          if (current >= total) {
            process.stdout.write('\n');
          }
        },
        catch: (error) => {
          throw new TerminalError(`Failed to print progress: ${error}`, error as Error, 'progress');
        },
      }),
  })
);

/**
 * Test implementation of TerminalService for testing
 */
export const TerminalServiceTest = Layer.succeed(
  TerminalService,
  TerminalService.of({
    print: (_message: string, _style?: TerminalStyle) => Effect.void,
    success: (_message: string) => Effect.void,
    error: (_message: string) => Effect.void,
    warning: (_message: string) => Effect.void,
    info: (_message: string) => Effect.void,
    table: (_data: unknown[], _options?: TableOptions) => Effect.void,
    progress: (_total: number, _current: number, _message?: string) => Effect.void,
  })
);

/**
 * Utility functions for creating styled terminal output
 */
export const TerminalUtils = {
  /**
   * Create a header with underline
   */
  header: (title: string) =>
    Effect.try({
      try: () => {
        const styled = styleText(title, { color: 'cyan', bold: true });
        const underline = styleText('='.repeat(title.length), { color: 'cyan' });
        process.stdout.write(`${styled}\n${underline}\n\n`);
      },
      catch: (error) => {
        throw new TerminalError(`Failed to print header: ${error}`, error as Error, 'header');
      },
    }),

  /**
   * Create a box around content
   */
  box: (content: string, title?: string) =>
    Effect.try({
      try: () => {
        const lines = content.split('\n');
        const maxLineLength = Math.max(
          ...(title ? [title.length] : []),
          ...lines.map((line) => line.length)
        );
        const padding = 2;
        const boxWidth = maxLineLength + padding * 2;

        const topBorder = `┌${'─'.repeat(boxWidth)}┐`;
        const bottomBorder = `└${'─'.repeat(boxWidth)}┘`;
        const emptyLine = `│${' '.repeat(boxWidth)}│`;

        const boxContent: string[] = [topBorder, emptyLine];

        if (title) {
          const titleLine = `│ ${styleText(title.padEnd(boxWidth - 2), { bold: true })} │`;
          boxContent.push(titleLine, emptyLine);
        }

        lines.forEach((line) => {
          boxContent.push(`│ ${line.padEnd(boxWidth - 2)} │`);
        });

        boxContent.push(emptyLine, bottomBorder);

        process.stdout.write(boxContent.join('\n') + '\n');
      },
      catch: (error) => {
        throw new TerminalError(`Failed to print box: ${error}`, error as Error, 'box');
      },
    }),

  /**
   * Clear the terminal screen
   */
  clear: () =>
    Effect.try({
      try: () => {
        process.stdout.write('\x1b[2J\x1b[H');
      },
      catch: (error) => {
        throw new TerminalError(`Failed to clear terminal: ${error}`, error as Error, 'clear');
      },
    }),
};
