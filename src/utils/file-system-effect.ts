/**
 * Effect-based file system utilities
 * Replaces Node fs operations with @effect/platform
 */

import { Effect, Context, Layer } from 'effect';
import { FileSystem, Path } from '@effect/platform';
import { FileSystemError } from '../errors.js';

/**
 * File system service interface
 */
export interface FileSystemService {
  readonly readFile: (path: string) => Effect.Effect<string, FileSystemError, never>;
  readonly writeFile: (
    path: string,
    content: string
  ) => Effect.Effect<void, FileSystemError, never>;
  readonly exists: (path: string) => Effect.Effect<boolean, never, never>;
  readonly makeDirectory: (
    path: string,
    options?: { recursive?: boolean }
  ) => Effect.Effect<void, FileSystemError, never>;
  readonly readDirectory: (path: string) => Effect.Effect<string[], FileSystemError, never>;
}

/**
 * File system service tag
 */
export const FileSystemService = Context.GenericTag('FileSystemService');

/**
 * File system service implementation
 */
export const FileSystemServiceLive = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const readFile = (filePath: string) =>
    fs.readFileString(filePath).pipe(
      Effect.mapError(
        (error) =>
          new FileSystemError({
            message: `Failed to read file ${filePath}: ${error}`,
            path: filePath,
            operation: 'readFile',
            cause: error,
          })
      )
    );

  const writeFile = (filePath: string, content: string) =>
    fs.writeFileString(filePath, content).pipe(
      Effect.mapError(
        (error) =>
          new FileSystemError({
            message: `Failed to write file ${filePath}: ${error}`,
            path: filePath,
            operation: 'writeFile',
            cause: error,
          })
      )
    );

  const exists = (filePath: string) =>
    fs.exists(filePath).pipe(
      Effect.mapError(
        (error) =>
          new FileSystemError({
            message: `Failed to check if file exists ${filePath}: ${error}`,
            path: filePath,
            operation: 'exists',
            cause: error,
          })
      )
    );

  const makeDirectory = (dirPath: string, options?: { recursive?: boolean }) =>
    fs.makeDirectory(dirPath, options).pipe(
      Effect.mapError(
        (error) =>
          new FileSystemError({
            message: `Failed to create directory ${dirPath}: ${error}`,
            path: dirPath,
            operation: 'makeDirectory',
            cause: error,
          })
      )
    );

  const readDirectory = (dirPath: string) =>
    fs.readDirectory(dirPath).pipe(
      Effect.mapError(
        (error) =>
          new FileSystemError({
            message: `Failed to read directory ${dirPath}: ${error}`,
            path: dirPath,
            operation: 'readDirectory',
            cause: error,
          })
      )
    );

  return {
    readFile,
    writeFile,
    exists,
    makeDirectory,
    readDirectory,
  } as FileSystemService;
});

/**
 * File system layer
 */
export const FileSystemLive = Layer.effect(FileSystemService, FileSystemServiceLive);
