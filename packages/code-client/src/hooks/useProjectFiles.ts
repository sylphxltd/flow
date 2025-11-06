/**
 * Project Files Hook
 * Loads project files on mount for @file auto-completion
 */

import { useEffect, useState } from 'react';
import { getTRPCClient } from '../trpc-provider.js';

export function useProjectFiles() {
  const [projectFiles, setProjectFiles] = useState<Array<{ path: string; relativePath: string; size: number }>>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  useEffect(() => {
    const loadFiles = async () => {
      setFilesLoading(true);
      try {
        const client = getTRPCClient();
        const result = await client.config.scanProjectFiles.query({ cwd: process.cwd() });
        setProjectFiles(result.files);
      } catch (error) {
        console.error('Failed to load project files:', error);
      } finally {
        setFilesLoading(false);
      }
    };

    loadFiles();
  }, []);

  return { projectFiles, filesLoading };
}
