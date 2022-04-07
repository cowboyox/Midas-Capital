import {
  Button,
  Grid,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useToast,
} from '@chakra-ui/react';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useConnect } from 'wagmi';

import { ModalDivider } from '@components/shared/Modal';
import { useColors } from '@hooks/useColors';
import { Column, Row } from '@utils/chakraUtils';

const ConnectWalletModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [
    {
      data: { connected, connectors },
      error: connectError,
    },
    connect,
  ] = useConnect();
  const { cCard, cOutlineBtn } = useColors();
  const { t } = useTranslation();
  const toast = useToast();

  useEffect(() => {
    if (connectError) {
      toast({
        title: connectError?.name === 'ConnectorAlreadyConnectedError' ? 'Warning!' : 'Error!',
        description: connectError?.message ?? 'Failed to connect',
        status: connectError?.name === 'ConnectorAlreadyConnectedError' ? 'warning' : 'error',
        duration: 9000,
        isClosable: true,
        position: 'top-right',
      });
    }
  }, [connectError, toast]);

  useEffect(() => {
    if (connected) {
      onClose();
    }
  }, [connected, onClose]);

  return (
    <Modal closeOnOverlayClick={false} isOpen={isOpen} onClose={onClose} isCentered size={'xl'}>
      <ModalOverlay />
      <ModalContent
        bg={cCard.bgColor}
        borderRadius="20px"
        border="2px"
        borderColor={cCard.borderColor}
      >
        <ModalHeader fontSize="1.5rem">{t('Select a Wallet')}</ModalHeader>
        <ModalCloseButton />
        <ModalDivider />
        <ModalBody py={12}>
          <Grid
            templateColumns={{ base: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' }}
            gap={{ base: 4, sm: 6 }}
          >
            {connectors.map((connector) => (
              <Button
                variant="outline"
                height="100%"
                key={connector.id}
                fontSize={'md'}
                borderRadius={12}
                borderColor={cOutlineBtn.primary.borderColor}
                borderWidth={2}
                disabled={!connector.ready}
                bg={cOutlineBtn.primary.bgColor}
                _hover={{
                  background: cOutlineBtn.primary.hoverBgColor,
                  color: cOutlineBtn.primary.hoverTxtColor,
                }}
                color={cOutlineBtn.primary.txtColor}
                onClick={() => {
                  connect(connector);
                }}
              >
                <Column mainAxisAlignment="flex-start" crossAxisAlignment="center">
                  <Row mainAxisAlignment="flex-start" crossAxisAlignment="center" mt={4}>
                    <Image
                      alt={`${connector.name}`}
                      src={`/images/${connector.name}.svg`}
                      boxSize={20}
                    />
                  </Row>
                  <Row mainAxisAlignment="flex-start" crossAxisAlignment="center" mt={4} mb={4}>
                    <Text fontSize={20}>
                      {connector.name}
                      {!connector.ready && ' (unsupported)'}
                    </Text>
                  </Row>
                </Column>
              </Button>
            ))}
          </Grid>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ConnectWalletModal;