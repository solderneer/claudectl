import React from "react";
import { Box, Text } from "ink";

const VERSION = "1.0.0";

export function Header() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="#D97757" bold>
        claudectl
      </Text>
      <Text dimColor>Multi-agent Claude orchestration</Text>
      <Box marginTop={1}>
        <Text color="blue" dimColor>
          v{VERSION}
        </Text>
      </Box>
    </Box>
  );
}
