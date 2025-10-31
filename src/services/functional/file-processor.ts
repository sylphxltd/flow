/**
 * Functional file processing service
 * Pure file transformations separated from I/O
 *
 * DESIGN RATIONALE:
 * - Pure transformation functions
 * - Composable processing pipeline
 * - Side effects (I/O) explicit and isolated
 * - Testable without file system
 */

import type { FileSystemError } from '../../core/functional/error-types.js';
import { fileSystemError } from '../../core/functional/error-types.js';
import type { Result } from '../../core/functional/result.js';
import { all, failure, success } from '../../core/functional/result.js';

/**
 * Domain types
 */

export interface FileContent {
  path: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessedFile {
  originalPath: string;
  processedContent: string;
  metadata: Record<string, unknown>;
}

export type FileTransform = (content: string) => string;
export type FileValidator = (content: string) => Result<string, FileSystemError>;

/**
 * Pure transformation functions
 */

/**
 * Trim whitespace from content
 */
export const trimContent: FileTransform = (content: string): string => {
  return content.trim();
};

/**
 * Normalize line endings to \n
 */
export const normalizeLineEndings: FileTransform = (content: string): string => {
  return content.replace(/\r\n/g, '\n');
};

/**
 * Remove trailing whitespace from each line
 */
export const removeTrailingWhitespace: FileTransform = (content: string): string => {
  return content
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');
};

/**
 * Ensure file ends with newline
 */
export const ensureTrailingNewline: FileTransform = (content: string): string => {
  if (!content.endsWith('\n')) {
    return `${content}\n`;
  }
  return content;
};

/**
 * Remove consecutive blank lines (keep max 1)
 */
export const collapseBlankLines: FileTransform = (content: string): string => {
  return content.replace(/\n\n\n+/g, '\n\n');
};

/**
 * Apply multiple transforms in sequence
 */
export const composeTransforms = (...transforms: FileTransform[]): FileTransform => {
  return (content: string) => transforms.reduce((acc, transform) => transform(acc), content);
};

/**
 * Standard cleanup pipeline
 */
export const standardCleanup: FileTransform = composeTransforms(
  normalizeLineEndings,
  removeTrailingWhitespace,
  collapseBlankLines,
  ensureTrailingNewline
);

/**
 * Validation functions
 */

/**
 * Validate content is not empty
 */
export const validateNotEmpty: FileValidator = (
  content: string
): Result<string, FileSystemError> => {
  if (content.trim().length === 0) {
    return failure(fileSystemError('File content is empty', '', 'read'));
  }
  return success(content);
};

/**
 * Validate content size
 */
export const validateSize =
  (maxBytes: number): FileValidator =>
  (content: string): Result<string, FileSystemError> => {
    const bytes = Buffer.byteLength(content, 'utf-8');
    if (bytes > maxBytes) {
      return failure(
        fileSystemError(`File content exceeds maximum size: ${bytes} > ${maxBytes}`, '', 'read', {
          context: { bytes, maxBytes },
        })
      );
    }
    return success(content);
  };

/**
 * Validate content matches pattern
 */
export const validatePattern =
  (pattern: RegExp, message: string): FileValidator =>
  (content: string): Result<string, FileSystemError> => {
    if (!pattern.test(content)) {
      return failure(fileSystemError(message, '', 'read'));
    }
    return success(content);
  };

/**
 * Compose validators
 */
export const composeValidators =
  (...validators: FileValidator[]): FileValidator =>
  (content: string): Result<string, FileSystemError> => {
    for (const validator of validators) {
      const result = validator(content);
      if (result._tag === 'Failure') {
        return result;
      }
    }
    return success(content);
  };

/**
 * File processing operations
 */

/**
 * Process a single file (pure transformation)
 */
export const processFileContent = (
  file: FileContent,
  transform: FileTransform,
  validator?: FileValidator
): Result<ProcessedFile, FileSystemError> => {
  // Validate if validator provided
  if (validator) {
    const validationResult = validator(file.content);
    if (validationResult._tag === 'Failure') {
      return validationResult;
    }
  }

  // Apply transformation
  const processedContent = transform(file.content);

  return success({
    originalPath: file.path,
    processedContent,
    metadata: {
      ...file.metadata,
      processed: true,
      originalLength: file.content.length,
      processedLength: processedContent.length,
    },
  });
};

/**
 * Process multiple files
 */
export const processFiles = (
  files: FileContent[],
  transform: FileTransform,
  validator?: FileValidator
): Result<ProcessedFile[], FileSystemError> => {
  const results = files.map((file) => processFileContent(file, transform, validator));

  return all(results);
};

/**
 * Filter files by extension (pure)
 */
export const filterByExtension =
  (extensions: string[]) =>
  (files: FileContent[]): FileContent[] => {
    return files.filter((file) => {
      const ext = file.path.split('.').pop()?.toLowerCase();
      return ext && extensions.includes(ext);
    });
  };

/**
 * Filter files by pattern (pure)
 */
export const filterByPattern =
  (pattern: RegExp) =>
  (files: FileContent[]): FileContent[] => {
    return files.filter((file) => pattern.test(file.path));
  };

/**
 * Sort files by path (pure)
 */
export const sortByPath = (files: FileContent[]): FileContent[] => {
  return [...files].sort((a, b) => a.path.localeCompare(b.path));
};

/**
 * Group files by directory (pure)
 */
export const groupByDirectory = (files: FileContent[]): Record<string, FileContent[]> => {
  return files.reduce(
    (acc, file) => {
      const dir = file.path.split('/').slice(0, -1).join('/') || '.';
      if (!acc[dir]) {
        acc[dir] = [];
      }
      acc[dir].push(file);
      return acc;
    },
    {} as Record<string, FileContent[]>
  );
};

/**
 * Extract metadata from content (pure)
 */
export const extractMetadata =
  (extractor: (content: string) => Record<string, unknown>) =>
  (file: FileContent): FileContent => {
    return {
      ...file,
      metadata: {
        ...file.metadata,
        ...extractor(file.content),
      },
    };
  };

/**
 * Building block for file processing pipelines
 */
export const createFileProcessor = (transform: FileTransform, validator?: FileValidator) => {
  return (files: FileContent[]): Result<ProcessedFile[], FileSystemError> => {
    return processFiles(files, transform, validator);
  };
};
