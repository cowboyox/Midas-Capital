import {
  Box,
  Button,
  Divider,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Text,
} from '@chakra-ui/react';
import { WETHAbi } from '@midas-capital/sdk';
import { FundOperationMode, VaultData } from '@midas-capital/types';
import { useAddRecentTransaction } from '@rainbow-me/rainbowkit';
import { useQueryClient } from '@tanstack/react-query';
import { BigNumber, constants } from 'ethers';
import { useEffect, useMemo, useState } from 'react';
import { getContract } from 'sdk/dist/cjs/src/MidasSdk/utils';

import { PendingTransaction } from '@ui/components/pages/VaultsPage/VaultsList/AdditionalInfo/FundButton/SupplyModal/PendingTransaction';
import { SupplyError } from '@ui/components/pages/VaultsPage/VaultsList/AdditionalInfo/FundButton/SupplyModal/SupplyError';
import { Banner } from '@ui/components/shared/Banner';
import { EllipsisText } from '@ui/components/shared/EllipsisText';
import { Column } from '@ui/components/shared/Flex';
import { TokenIcon } from '@ui/components/shared/TokenIcon';
import { SUPPLY_STEPS } from '@ui/constants/index';
import { useMultiMidas } from '@ui/context/MultiMidasContext';
import { useColors } from '@ui/hooks/useColors';
import { useErrorToast, useSuccessToast } from '@ui/hooks/useToast';
import { useTokenBalance } from '@ui/hooks/useTokenBalance';
import { useTokenData } from '@ui/hooks/useTokenData';
import { TxStep } from '@ui/types/ComponentPropsType';
import { smallFormatter } from '@ui/utils/bigUtils';
import { handleGenericError } from '@ui/utils/errorHandling';
import { StatsColumn } from 'ui/components/pages/VaultsPage/VaultsList/AdditionalInfo/FundButton/StatsColumn/index';
import { AmountInput } from 'ui/components/pages/VaultsPage/VaultsList/AdditionalInfo/FundButton/SupplyModal/AmountInput';
import { Balance } from 'ui/components/pages/VaultsPage/VaultsList/AdditionalInfo/FundButton/SupplyModal/Balance';

interface SupplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: VaultData;
}

export const SupplyModal = ({ isOpen, onClose, vault }: SupplyModalProps) => {
  const { currentSdk, address, currentChain } = useMultiMidas();
  const addRecentTransaction = useAddRecentTransaction();
  if (!currentChain || !currentSdk) throw new Error("SDK doesn't exist");

  const errorToast = useErrorToast();
  const { data: tokenData } = useTokenData(vault.asset, Number(vault.chainId));
  const [amount, setAmount] = useState<BigNumber>(constants.Zero);
  const { cCard } = useColors();
  const { data: myBalance } = useTokenBalance(vault.asset);
  const { data: myNativeBalance } = useTokenBalance('NO_ADDRESS_HERE_USE_WETH_FOR_ADDRESS');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSupplying, setIsSupplying] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [failedStep, setFailedStep] = useState<number>(0);
  const [btnStr, setBtnStr] = useState<string>('Supply');
  const [isAmountValid, setIsAmountValid] = useState<boolean>(false);
  const [steps, setSteps] = useState<TxStep[]>([...SUPPLY_STEPS(vault.symbol)]);
  const [confirmedSteps, setConfirmedSteps] = useState<TxStep[]>([]);
  const successToast = useSuccessToast();
  const nativeSymbol = currentChain.nativeCurrency?.symbol;
  const optionToWrap = useMemo(() => {
    return (
      vault.asset === currentSdk.chainSpecificAddresses.W_TOKEN &&
      myBalance?.isZero() &&
      !myNativeBalance?.isZero()
    );
  }, [vault.asset, currentSdk.chainSpecificAddresses.W_TOKEN, myBalance, myNativeBalance]);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (amount.isZero() || !maxSupplyAmount) {
      setIsAmountValid(false);
    } else {
      const max = optionToWrap ? (myNativeBalance as BigNumber) : maxSupplyAmount.bigNumber;
      setIsAmountValid(amount.lte(max));
    }
  }, [amount, maxSupplyAmount, optionToWrap, myNativeBalance]);

  useEffect(() => {
    if (amount.isZero()) {
      setBtnStr('Enter a valid amount to supply');
    } else if (isLoading) {
      setBtnStr(`Loading your balance of ${asset.underlyingSymbol}...`);
    } else {
      if (isAmountValid) {
        setBtnStr('Supply');
      } else {
        setBtnStr(`You don't have enough ${asset.underlyingSymbol}`);
      }
    }
  }, [amount, isLoading, isAmountValid, asset.underlyingSymbol]);

  const onConfirm = async () => {
    if (!currentSdk || !address) return;

    const sentryProperties = {
      token: asset.cToken,
      chainId: currentSdk.chainId,
      comptroller: comptrollerAddress,
    };

    setIsConfirmed(true);
    setConfirmedSteps([...steps]);
    const _steps = [...steps];

    setIsSupplying(true);
    setActiveStep(0);
    setFailedStep(0);
    if (optionToWrap) {
      try {
        setActiveStep(1);
        const WToken = getContract(
          currentSdk.chainSpecificAddresses.W_TOKEN,
          WETHAbi,
          currentSdk.signer
        );
        const tx = await WToken.deposit({ from: address, value: amount });

        addRecentTransaction({
          hash: tx.hash,
          description: `Wrap ${nativeSymbol}`,
        });
        _steps[0] = {
          ..._steps[0],
          txHash: tx.hash,
        };
        setConfirmedSteps([..._steps]);
        await tx.wait();
        _steps[0] = {
          ..._steps[0],
          done: true,
          txHash: tx.hash,
        };
        setConfirmedSteps([..._steps]);
        successToast({
          id: 'wrapped',
          description: 'Successfully Wrapped!',
        });
      } catch (error) {
        const sentryInfo = {
          contextName: 'Supply - Wrapping native token',
          properties: sentryProperties,
        };
        handleGenericError({ error, toast: errorToast, sentryInfo });
        setFailedStep(1);
      }
    }

    try {
      setActiveStep(optionToWrap ? 2 : 1);
      const token = currentSdk.getEIP20RewardTokenInstance(
        asset.underlyingToken,
        currentSdk.signer
      );
      const hasApprovedEnough = (await token.callStatic.allowance(address, asset.cToken)).gte(
        amount
      );

      if (!hasApprovedEnough) {
        const tx = await currentSdk.approve(asset.cToken, asset.underlyingToken);

        addRecentTransaction({
          hash: tx.hash,
          description: `Approve ${asset.underlyingSymbol}`,
        });
        _steps[optionToWrap ? 1 : 0] = {
          ..._steps[optionToWrap ? 1 : 0],
          txHash: tx.hash,
        };
        setConfirmedSteps([..._steps]);

        await tx.wait();

        _steps[optionToWrap ? 1 : 0] = {
          ..._steps[optionToWrap ? 1 : 0],
          done: true,
          txHash: tx.hash,
        };
        setConfirmedSteps([..._steps]);
        successToast({
          id: 'approved',
          description: 'Successfully Approved!',
        });
      } else {
        _steps[optionToWrap ? 1 : 0] = {
          ..._steps[optionToWrap ? 1 : 0],
          desc: 'Already approved!',
          done: true,
        };
        setConfirmedSteps([..._steps]);
      }
    } catch (error) {
      const sentryInfo = {
        contextName: 'Supply - Approving',
        properties: sentryProperties,
      };
      handleGenericError({ error, toast: errorToast, sentryInfo });
      setFailedStep(optionToWrap ? 2 : 1);
    }

    try {
      setActiveStep(optionToWrap ? 3 : 2);
      const { tx, errorCode } = await currentSdk.mint(asset.cToken, amount);
      if (errorCode !== null) {
        SupplyError(errorCode);
      } else {
        addRecentTransaction({
          hash: tx.hash,
          description: `${asset.underlyingSymbol} Token Supply`,
        });
        _steps[optionToWrap ? 2 : 1] = {
          ..._steps[optionToWrap ? 2 : 1],
          txHash: tx.hash,
        };
        setConfirmedSteps([..._steps]);

        await tx.wait();
        await queryClient.refetchQueries();

        _steps[optionToWrap ? 2 : 1] = {
          ..._steps[optionToWrap ? 2 : 1],
          done: true,
          txHash: tx.hash,
        };
        setConfirmedSteps([..._steps]);
      }
    } catch (error) {
      const sentryInfo = {
        contextName: 'Supply - Minting',
        properties: sentryProperties,
      };
      handleGenericError({ error, toast: errorToast, sentryInfo });
      setFailedStep(optionToWrap ? 3 : 2);
    }

    setIsSupplying(false);
  };

  const onModalClose = () => {
    onClose();

    if (!isSupplying) {
      setAmount(constants.Zero);
      setIsConfirmed(false);
      let _steps = [...SUPPLY_STEPS(asset.underlyingSymbol)];

      if (optionToWrap) {
        _steps = [
          { title: 'Wrap Native Token', desc: 'Wrap Native Token', done: false },
          ..._steps,
        ];
      }

      setSteps(_steps);
    }
  };

  useEffect(() => {
    let _steps = [...SUPPLY_STEPS(asset.underlyingSymbol)];

    if (optionToWrap) {
      _steps = [{ title: 'Wrap Native Token', desc: 'Wrap Native Token', done: false }, ..._steps];
    }

    setSteps(_steps);
  }, [optionToWrap, asset.underlyingSymbol]);

  return (
    <Modal
      closeOnEsc={false}
      closeOnOverlayClick={false}
      isCentered
      isOpen={isOpen}
      motionPreset="slideInBottom"
      onClose={onModalClose}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalBody p={0}>
          <Column
            bg={cCard.bgColor}
            borderRadius={16}
            color={cCard.txtColor}
            crossAxisAlignment="flex-start"
            id="fundOperationModal"
            mainAxisAlignment="flex-start"
          >
            {!isSupplying && <ModalCloseButton right={4} top={4} />}
            {isConfirmed ? (
              <PendingTransaction
                activeStep={activeStep}
                amount={amount}
                asset={asset}
                failedStep={failedStep}
                isSupplying={isSupplying}
                poolChainId={poolChainId}
                steps={confirmedSteps}
              />
            ) : (
              <>
                <HStack justifyContent="center" my={4} width="100%">
                  <Text variant="title">Supply</Text>
                  <Box height="36px" mx={2} width="36px">
                    <TokenIcon address={asset.underlyingToken} chainId={poolChainId} size="36" />
                  </Box>
                  <EllipsisText
                    maxWidth="100px"
                    tooltip={tokenData?.symbol || asset.underlyingSymbol}
                    variant="title"
                  >
                    {tokenData?.symbol || asset.underlyingSymbol}
                  </EllipsisText>
                </HStack>

                <Divider />

                <Column
                  crossAxisAlignment="center"
                  gap={4}
                  height="100%"
                  mainAxisAlignment="flex-start"
                  p={4}
                  width="100%"
                >
                  {!supplyCap || asset.totalSupplyFiat < supplyCap.usdCap ? (
                    <>
                      <Column gap={1} w="100%">
                        <AmountInput
                          asset={asset}
                          comptrollerAddress={comptrollerAddress}
                          optionToWrap={optionToWrap}
                          poolChainId={poolChainId}
                          setAmount={setAmount}
                        />

                        <Balance asset={asset} />
                      </Column>
                      <StatsColumn
                        amount={amount}
                        asset={asset}
                        assets={assets}
                        mode={FundOperationMode.SUPPLY}
                        poolChainId={poolChainId}
                      />
                      <Button
                        height={16}
                        id="confirmFund"
                        isDisabled={!isAmountValid}
                        onClick={onConfirm}
                        width="100%"
                      >
                        {optionToWrap ? `Wrap ${nativeSymbol} & ${btnStr}` : btnStr}
                      </Button>
                    </>
                  ) : (
                    <Banner
                      alertDescriptionProps={{ fontSize: 'lg' }}
                      alertProps={{ status: 'info' }}
                      descriptions={[
                        {
                          text: `${smallFormatter(supplyCap.tokenCap)} ${
                            asset.underlyingSymbol
                          } / ${smallFormatter(supplyCap.tokenCap)} ${asset.underlyingSymbol}`,
                          textProps: { display: 'block', fontWeight: 'bold' },
                        },
                        {
                          text: 'The maximum supply of assets for this asset has been reached. Once assets are withdrawn or the limit is increased you can again supply to this market.',
                        },
                      ]}
                    />
                  )}
                </Column>
              </>
            )}
          </Column>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};