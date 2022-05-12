import {
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverBodyProps,
  PopoverContent,
  PopoverFooter,
  PopoverFooterProps,
  PopoverHeader,
  PopoverHeaderProps,
  PopoverProps,
  PopoverTrigger,
} from '@chakra-ui/react';

import { useColors } from '@hooks/useColors';

export const PopoverTooltip = ({
  children,
  header,
  body,
  footer,
  ...popoverProps
}: {
  header?: PopoverHeaderProps['children'];
  body?: PopoverBodyProps['children'];
  footer?: PopoverFooterProps['children'];
} & PopoverProps) => {
  const { cPage } = useColors();
  return (
    <>
      <style>
        {`
            .chakra-popover__arrow {
              border-right: 1px solid ${cPage.primary.borderColor};
              border-bottom: 1px solid ${cPage.primary.borderColor};
            }
        `}
      </style>
      <Popover placement="top" trigger="hover" {...popoverProps}>
        <PopoverTrigger>{children}</PopoverTrigger>
        <PopoverContent>
          <PopoverArrow />
          {header && <PopoverHeader>{header}</PopoverHeader>}
          {body && <PopoverBody>{body}</PopoverBody>}
          {footer && <PopoverFooter>{footer}</PopoverFooter>}
        </PopoverContent>
      </Popover>
    </>
  );
};
