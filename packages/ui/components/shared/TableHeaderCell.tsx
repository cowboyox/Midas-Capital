import { Box, HStack, Text } from '@chakra-ui/react';
import { HeaderContext } from '@tanstack/react-table';
import { ReactNode } from 'react';
export const TableHeaderCell = ({
  context,
  children,
}: {
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  context: HeaderContext<any, any>;
  children: ReactNode;
}) => {
  return (
    <HStack spacing={1} cursor={context.column.getCanSort() ? 'pointer' : 'default'}>
      <Text
        fontWeight={context.column.getIsSorted() ? 'bold' : 'normal'}
        size="sm"
        variant="table-head"
      >
        {children}
      </Text>
      {context.column.getCanSort() && (
        <Box hidden={!context.column.getIsSorted()}>
          {context.column.getIsSorted() === 'desc' ? (
            <Text size="sm">↓</Text>
          ) : (
            <Text size="sm">↑</Text>
          )}
        </Box>
      )}
    </HStack>
  );
};

export default TableHeaderCell;