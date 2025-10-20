import * as Cli from '@effect/cli';
import * as Help from '@effect/cli';
import * as Platform from '@effect/platform/NodePlatform';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { pipe } from 'effect/Function';

// Placeholder for commands - will migrate in Task 8
const initCommand = Cli.command('init')({}, () => Effect.succeed({ _tag: 'Init' }));

const runCommand = Cli.command('run')({}, () => Effect.succeed({ _tag: 'Run' }));

// Simple placeholder commands for now
const commands = [initCommand, runCommand] as const;

export const cliApp = pipe(
  Cli.root(
    Cli.program('sylphx-flow')({
      version: '1.0.0',
      description: 'Sylphx Flow - Type-safe development flow CLI',
    }),
    ({ help, _ }) => {
      if (help) {
        return Effect.succeed({
          _tag: 'Help',
          helpDoc: Help.makeCliDoc('sylphx-flow', commands, { showUnrecognized: false }),
        });
      }
      return Effect.succeed({ _tag: 'NoCommand' });
    }
  ),
  Cli.addCommands(commands)
);

export async function runCLI() {
  const args = process.argv.slice(2);
  const result = await Effect.runPromise(
    pipe(
      Cli.run(cliApp, { argv: args, singleCommand: false }),
      Effect.flatMap((exit) => {
        if (Exit.isSuccess(exit)) {
          const value = exit.value;
          if ('_tag' in value && value._tag === 'Help') {
            console.log(Help.prettyPrint(value.helpDoc));
            return Effect.succeed(0);
          } else if ('_tag' in value && value._tag === 'Version') {
            console.log('1.0.0');
            return Effect.succeed(0);
          } else if ('_tag' in value && value._tag === 'NoCommand') {
            console.log(
              Help.prettyPrint(
                Help.makeCliDoc('sylphx-flow', commands, { showUnrecognized: false })
              )
            );
            return Effect.succeed(0);
          }
          // For command execution, handle later
          return Effect.succeed(0);
        } else {
          console.error('CLI error:', exit.cause);
          return Effect.succeed(1);
        }
      })
    )
  );
  process.exit(result);
}
