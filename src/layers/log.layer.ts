import * as Log from "@effect/log";
import * as Layer from "effect/Layer";
import * as Context from "effect/Context";

// Define logger tag
export class Logger extends Context.Tag("Logger")<Logger, Log.Logger>() {}

// Create logging layer
export const logLayer = Layer.effect(Logger, Log.makeLayer(Log.ConsoleLogger)()).pipe(
  Layer.provide(Layer.succeed(Log.defaultFormatter))
);

export const withLogSpan = <A>(message: string, effect: Effect.Effect<A>) =>
  Log.withSpan(message, effect);
