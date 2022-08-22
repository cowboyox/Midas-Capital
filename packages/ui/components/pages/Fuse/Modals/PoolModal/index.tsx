import { Modal, ModalBody, ModalContent, ModalOverlay } from '@chakra-ui/react';
import { FundOperationMode } from '@midas-capital/types';
import { useEffect, useState } from 'react';

import AmountSelect from '@ui/components/pages/Fuse/Modals/PoolModal/AmountSelect';
import { MarketData } from '@ui/types/TokensDataMap';

interface PoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode: FundOperationMode;
  index: number;
  assets: MarketData[];
  comptrollerAddress: string;
}

const PoolModal = (props: PoolModalProps) => {
  const [mode, setMode] = useState(props.defaultMode);
  useEffect(() => {
    setMode(props.defaultMode);
  }, [props.isOpen, props.defaultMode]);

  return (
    <Modal motionPreset="slideInBottom" isOpen={props.isOpen} onClose={props.onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalBody p={0}>
          <AmountSelect
            comptrollerAddress={props.comptrollerAddress}
            onClose={props.onClose}
            assets={props.assets}
            index={props.index}
            mode={mode}
            setMode={setMode}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default PoolModal;
