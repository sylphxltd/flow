import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Context from "effect/Context";
import * as readline from "readline";

interface PromptService extends Effect.Service<PromptService> {
  readonly confirm: Effect.Effect<never, Error, (message: string, defaultYes?: boolean) => boolean>;
  readonly input: Effect.Effect<never, Error, (message: string, defaultValue?: string) => string>;
}

const PromptServiceTag = Context.GenericTag<PromptService>("@services/PromptService");

const makePromptService = Effect.gen(function* () {
  const confirm = (message: string, defaultYes = false): Effect.Effect<never, Error, boolean> => Effect.tryPromise({
    try: () => new Promise<boolean>((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question(`${message} ${(defaultYes ? '[Y/n]' : '[y/N]')}: `, (answer) => {
        rl.close();
        const lower = answer.toLowerCase().trim();
        resolve(lower === '' ? defaultYes : lower === 'y' || lower === 'yes');
      });
    }),
    catch: (error) => new Error(`Prompt confirm error: ${String(error)}`)
  });

  const input = (message: string, defaultValue = ""): Effect.Effect<never, Error, string> => Effect.tryPromise({
    try: () => new Promise<string>((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question(`${message} [${defaultValue}]: `, (answer) => {
        rl.close();
        resolve(answer.trim() || defaultValue);
      });
    }),
    catch: (error) => new Error(`Prompt input error: ${String(error)}`)
  });

  return { confirm, input };
});

export const PromptServiceLive = Layer.effect(PromptServiceTag, makePromptService);
export { PromptServiceTag };
export type PromptService = Effect.Service<PromptService>;
