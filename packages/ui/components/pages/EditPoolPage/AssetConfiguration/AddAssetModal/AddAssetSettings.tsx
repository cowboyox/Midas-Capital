import { QuestionIcon } from '@chakra-ui/icons';
import {
  Button,
  Divider,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Link,
  Select,
  Text,
  VStack,
} from '@chakra-ui/react';
import { MarketConfig } from '@midas-capital/types';
import { useQueryClient } from '@tanstack/react-query';
import { constants } from 'ethers';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Center, Column } from '@ui/components/shared/Flex';
import { PopoverTooltip } from '@ui/components/shared/PopoverTooltip';
import { SimpleTooltip } from '@ui/components/shared/SimpleTooltip';
import { SliderWithLabel } from '@ui/components/shared/SliderWithLabel';
import {
  ADMIN_FEE,
  ADMIN_FEE_TOOLTIP,
  LOAN_TO_VALUE,
  LOAN_TO_VALUE_TOOLTIP,
  RESERVE_FACTOR,
} from '@ui/constants/index';
import { useMultiMidas } from '@ui/context/MultiMidasContext';
import { useExtraPoolInfo } from '@ui/hooks/fuse/useExtraPoolInfo';
import { useColors } from '@ui/hooks/useColors';
import { useErrorToast, useSuccessToast } from '@ui/hooks/useToast';
import { TokenData } from '@ui/types/ComponentPropsType';
import { handleGenericError } from '@ui/utils/errorHandling';

const IRMChart = dynamic(
  () => import('@ui/components/pages/EditPoolPage/AssetConfiguration/IRMChart'),
  {
    ssr: false,
  }
);

type AddAssetFormData = {
  collateralFactor: number;
  reserveFactor: number;
  adminFee: number;
  pluginIndex: number;
  interestRateModel: string;
};

export const AddAssetSettings = ({
  comptrollerAddress,
  onSuccess,
  poolID,
  poolName,
  tokenData,
  poolChainId,
}: {
  comptrollerAddress: string;
  onSuccess?: () => void;
  poolID: string;
  poolName: string;
  tokenData: TokenData;
  poolChainId: number;
}) => {
  const { currentSdk, currentChain } = useMultiMidas();
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();
  const queryClient = useQueryClient();
  const { cCard, cSelect } = useColors();
  const { data } = useExtraPoolInfo(comptrollerAddress, poolChainId);

  const [isDeploying, setIsDeploying] = useState(false);
  const [isPossible, setIsPossible] = useState<boolean>(true);

  if (!currentSdk) throw new Error("SDK doesn't exist!");

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      collateralFactor: LOAN_TO_VALUE.DEFAULT,
      reserveFactor: RESERVE_FACTOR.DEFAULT,
      adminFee: ADMIN_FEE.DEFAULT,
      pluginIndex: -1,
      interestRateModel: currentSdk.chainDeployment.JumpRateModel.address,
    },
  });

  const watchAdminFee = watch('adminFee', ADMIN_FEE.DEFAULT);
  const watchReserveFactor = watch('reserveFactor', RESERVE_FACTOR.DEFAULT);
  const watchInterestRateModel = watch(
    'interestRateModel',
    currentSdk.chainDeployment.JumpRateModel.address
  );

  const availablePlugins = useMemo(() => [], []);

  useEffect(() => {
    const func = async () => {
      setIsPossible(false);
      try {
        const masterPriceOracle = currentSdk.createMasterPriceOracle();
        const res = await masterPriceOracle.callStatic.oracles(tokenData.address);
        if (res === constants.AddressZero) {
          errorToast({
            description:
              'This asset is not supported. The price oracle is not available for this asset',
          });

          return;
        }
      } catch (e) {
        console.error(e);
        return;
      }
      setIsPossible(true);
    };

    func();
  }, [tokenData.address, errorToast, currentSdk]);

  const deploy = async (data: AddAssetFormData) => {
    const { collateralFactor, reserveFactor, adminFee, pluginIndex, interestRateModel } = data;
    const plugin = pluginIndex === -1 ? undefined : availablePlugins[pluginIndex];

    setIsDeploying(true);

    const marketConfig: MarketConfig = {
      underlying: tokenData.address,
      comptroller: comptrollerAddress,
      adminFee: adminFee,
      collateralFactor: collateralFactor,
      interestRateModel: interestRateModel,
      reserveFactor: reserveFactor,
      plugin: plugin,
      bypassPriceFeedCheck: true,
      fuseFeeDistributor: currentSdk.chainDeployment.FuseFeeDistributor.address,
      symbol: 'f' + tokenData.symbol + '-' + poolID,
      name: poolName + ' ' + tokenData.name,
    };

    try {
      await currentSdk.deployAsset(marketConfig);

      await queryClient.refetchQueries();
      // Wait 2 seconds for refetch and then close modal.
      // We do this instead of waiting the refetch because some fetches take a while or error out and we want to close now.
      await new Promise((resolve) => setTimeout(resolve, 2000));

      successToast({
        title: 'You have successfully added an asset to this pool!',
        description: 'You may now lend and borrow with this asset.',
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      const sentryProperties = {
        underlying: tokenData.address,
        chainId: currentSdk.chainId,
        comptroller: comptrollerAddress,
        symbol: tokenData.symbol,
      };
      const sentryInfo = {
        contextName: 'Adding asset',
        properties: sentryProperties,
      };
      handleGenericError({ error, toast: errorToast, sentryInfo });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <VStack as="form" height="100%" onSubmit={handleSubmit(deploy)} width="100%">
      <Divider />
      <FormControl isInvalid={!!errors.collateralFactor}>
        <HStack justifyContent={'space-between'} px={4} py={2} w="100%">
          <FormLabel htmlFor="collateralFactor">
            <SimpleTooltip label={LOAN_TO_VALUE_TOOLTIP}>
              <Text fontWeight="bold">
                Loan-to-Value{' '}
                <QuestionIcon
                  bg={cCard.bgColor}
                  borderRadius={'50%'}
                  color={cCard.txtColor}
                  mb="4px"
                  ml={1}
                />
              </Text>
            </SimpleTooltip>
          </FormLabel>
          <Column crossAxisAlignment="flex-start" mainAxisAlignment="flex-start">
            <Controller
              control={control}
              name="collateralFactor"
              render={({ field: { name, value, ref, onChange } }) => (
                <SliderWithLabel
                  isDisabled={
                    !data?.isPowerfulAdmin || !currentChain || currentChain.id !== poolChainId
                  }
                  max={LOAN_TO_VALUE.MAX}
                  min={LOAN_TO_VALUE.MIN}
                  name={name}
                  onChange={onChange}
                  reff={ref}
                  value={value}
                />
              )}
              rules={{
                required: 'Loan-to-Value is required',
                min: {
                  value: LOAN_TO_VALUE.MIN,
                  message: `Loan-to-Value must be at least ${LOAN_TO_VALUE.MIN}%`,
                },
                max: {
                  value: LOAN_TO_VALUE.MAX,
                  message: `Loan-to-Value must be no more than ${LOAN_TO_VALUE.MAX}%`,
                },
              }}
            />
            <FormErrorMessage marginBottom="-10px" maxWidth="270px">
              {errors.collateralFactor && errors.collateralFactor.message}
            </FormErrorMessage>
          </Column>
        </HStack>
      </FormControl>
      <Divider />
      <FormControl isInvalid={!!errors.reserveFactor}>
        <HStack justifyContent={'space-between'} px={4} py={2} w="100%">
          <FormLabel htmlFor="reserveFactor">
            <SimpleTooltip
              label={
                "The fraction of interest generated on a given asset that is routed to the asset's Reserve Pool. The Reserve Pool protects lenders against borrower default and liquidation malfunction."
              }
            >
              <Text fontWeight="bold">
                Reserve Factor{' '}
                <QuestionIcon
                  bg={cCard.bgColor}
                  borderRadius={'50%'}
                  color={cCard.txtColor}
                  mb="4px"
                  ml={1}
                />
              </Text>
            </SimpleTooltip>
          </FormLabel>
          <Column crossAxisAlignment="flex-start" mainAxisAlignment="flex-start">
            <Controller
              control={control}
              name="reserveFactor"
              render={({ field: { name, value, ref, onChange } }) => (
                <SliderWithLabel
                  isDisabled={
                    !data?.isPowerfulAdmin || !currentChain || currentChain.id !== poolChainId
                  }
                  max={RESERVE_FACTOR.MAX}
                  min={RESERVE_FACTOR.MIN}
                  name={name}
                  onChange={onChange}
                  reff={ref}
                  value={value}
                />
              )}
              rules={{
                required: 'Reserve factor is required',
                min: {
                  value: RESERVE_FACTOR.MIN,
                  message: `Reserve factor must be at least ${RESERVE_FACTOR.MIN}%`,
                },
                max: {
                  value: RESERVE_FACTOR.MAX,
                  message: `Reserve factor must be no more than ${RESERVE_FACTOR.MAX}%`,
                },
              }}
            />
            <FormErrorMessage marginBottom="-10px" maxWidth="270px">
              {errors.reserveFactor && errors.reserveFactor.message}
            </FormErrorMessage>
          </Column>
        </HStack>
      </FormControl>
      <Divider />
      <FormControl isInvalid={!!errors.adminFee}>
        <HStack justifyContent={'space-between'} px={4} py={2} w="100%">
          <FormLabel htmlFor="adminFee">
            <SimpleTooltip label={ADMIN_FEE_TOOLTIP}>
              <Text fontWeight="bold">
                Admin Fee{' '}
                <QuestionIcon
                  bg={cCard.bgColor}
                  borderRadius={'50%'}
                  color={cCard.txtColor}
                  mb="4px"
                  ml={1}
                />
              </Text>
            </SimpleTooltip>
          </FormLabel>
          <Column crossAxisAlignment="flex-start" mainAxisAlignment="flex-start">
            <Controller
              control={control}
              name="adminFee"
              render={({ field: { name, value, ref, onChange } }) => (
                <SliderWithLabel
                  isDisabled={
                    !data?.isPowerfulAdmin || !currentChain || currentChain.id !== poolChainId
                  }
                  max={ADMIN_FEE.MAX}
                  min={ADMIN_FEE.MIN}
                  name={name}
                  onChange={onChange}
                  reff={ref}
                  value={value}
                />
              )}
              rules={{
                required: 'Admin fee is required',
                min: {
                  value: ADMIN_FEE.MIN,
                  message: `Admin fee must be at least ${ADMIN_FEE.MIN}%`,
                },
                max: {
                  value: ADMIN_FEE.MAX,
                  message: `Admin fee must be no more than ${ADMIN_FEE.MAX}%`,
                },
              }}
            />
            <FormErrorMessage marginBottom="-10px" maxWidth="270px">
              {errors.adminFee && errors.adminFee.message}
            </FormErrorMessage>
          </Column>
        </HStack>
      </FormControl>
      <Divider />
      <FormControl isInvalid={!!errors.pluginIndex}>
        <HStack justifyContent={'space-between'} px={4} py={2} w="100%">
          <FormLabel htmlFor="oracle">
            <PopoverTooltip
              body={
                <>
                  This token has{' '}
                  <Link href="https://eips.ethereum.org/EIPS/eip-4626" isExternal variant={'color'}>
                    ERC4626 strategies
                  </Link>{' '}
                  implemented, allowing users to utilize their deposits (e.g. to stake them for
                  rewards) while using them as collateral. To learn mode about it, check out our{' '}
                  <Link href="https://docs.midascapital.xyz/" isExternal variant={'color'}>
                    docs
                  </Link>
                  .
                </>
              }
            >
              <HStack>
                <Text fontWeight="bold">Rewards Plugin </Text>
                <QuestionIcon
                  bg={cCard.bgColor}
                  borderRadius={'50%'}
                  color={cCard.txtColor}
                  mb="4px"
                  ml={1}
                />
              </HStack>
            </PopoverTooltip>
          </FormLabel>
          <Column crossAxisAlignment="flex-start" mainAxisAlignment="flex-start" maxW="270px">
            <Select
              id="pluginIndex"
              {...register('pluginIndex', {
                required: 'Plugin is required',
              })}
            >
              <option style={{ color: cSelect.txtColor }} value={-1}>
                No plugin
              </option>
              {availablePlugins.map((plugin, index) => (
                <option key={plugin} style={{ color: cSelect.txtColor }} value={index}>
                  {plugin}
                </option>
              ))}
            </Select>
            <FormErrorMessage marginBottom="-10px">
              {errors.pluginIndex && errors.pluginIndex.message}
            </FormErrorMessage>
          </Column>
        </HStack>
      </FormControl>
      <Divider />
      <FormControl isInvalid={!!errors.interestRateModel}>
        <HStack justifyContent={'space-between'} px={4} py={2} w="100%">
          <FormLabel htmlFor="interestRateModel">
            <SimpleTooltip
              label={
                'The interest rate model chosen for an asset defines the rates of interest for borrowers and suppliers at different utilization levels.'
              }
            >
              <Text fontWeight="bold">
                Interest Model{' '}
                <QuestionIcon
                  bg={cCard.bgColor}
                  borderRadius={'50%'}
                  color={cCard.txtColor}
                  mb="4px"
                  ml={1}
                />
              </Text>
            </SimpleTooltip>
          </FormLabel>
          <Column crossAxisAlignment="flex-start" mainAxisAlignment="flex-start" maxW="270px">
            <Select
              id="interestRateModel"
              {...register('interestRateModel', {
                required: 'interestRateModel is required',
              })}
              cursor="pointer"
              ml="auto"
              mt={{ base: 2, md: 0 }}
            >
              <option
                style={{ color: cSelect.txtColor }}
                value={currentSdk.chainDeployment.JumpRateModel.address}
              >
                JumpRateModel
              </option>
              <option
                style={{ color: cSelect.txtColor }}
                value={currentSdk.chainDeployment.WhitePaperInterestRateModel.address}
              >
                WhitePaperInterestRateModel
              </option>
            </Select>
            <FormErrorMessage marginBottom="-10px">
              {errors.interestRateModel && errors.interestRateModel.message}
            </FormErrorMessage>
          </Column>
        </HStack>
      </FormControl>
      <IRMChart
        adminFee={watchAdminFee}
        interestRateModelAddress={watchInterestRateModel}
        poolChainId={poolChainId}
        reserveFactor={watchReserveFactor}
      />
      <Center mt={4} px={4} width="100%">
        <Button
          disabled={isDeploying || !isPossible}
          isLoading={isDeploying}
          type="submit"
          width={'100%'}
        >
          Add Asset
        </Button>
      </Center>
    </VStack>
  );
};