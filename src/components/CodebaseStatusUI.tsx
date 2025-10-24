import { Box, Text } from 'ink';
import { Header, StatusMessage } from './ui/index.js';

interface CodebaseStatusUIProps {
  indexed: boolean;
  fileCount: number;
  indexedAt?: string;
}

export function CodebaseStatusUI({ indexed, fileCount, indexedAt }: CodebaseStatusUIProps) {
  return (
    <Box flexDirection="column">
      <Header title="Codebase Status" />

      {indexed ? (
        <>
          <StatusMessage type="success" message="Codebase indexed and ready" />

          <Box marginTop={1} flexDirection="column">
            <Text>
              <Text color="gray">Files: </Text>
              <Text color="cyan">{fileCount}</Text>
            </Text>
            {indexedAt && (
              <Text>
                <Text color="gray">Last indexed: </Text>
                <Text color="white">{new Date(indexedAt).toLocaleString()}</Text>
              </Text>
            )}
          </Box>
        </>
      ) : (
        <>
          <StatusMessage type="warning" message="Codebase not indexed" />

          <Box marginTop={1}>
            <Text dimColor>Run: sylphx-flow codebase reindex</Text>
          </Box>
        </>
      )}

      <Box marginTop={2} flexDirection="column">
        <Text dimColor bold>
          Available commands:
        </Text>
        <Text dimColor> • codebase search &lt;query&gt;</Text>
        <Text dimColor> • codebase reindex</Text>
        <Text dimColor> • codebase status</Text>
      </Box>
    </Box>
  );
}
