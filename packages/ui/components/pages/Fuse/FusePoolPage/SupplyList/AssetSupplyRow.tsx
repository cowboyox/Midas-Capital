import { ExternalLinkIcon, LinkIcon, QuestionIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Link as ChakraLink,
  HStack,
  Switch,
  Td,
  Text,
  Tr,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { FlywheelMarketRewardsInfo } from '@midas-capital/sdk/dist/cjs/src/modules/Flywheel';
import { FundOperationMode } from '@midas-capital/types';
import { ContractTransaction, utils } from 'ethers';
import LogRocket from 'logrocket';
import { useMemo } from 'react';

import { RewardsInfo } from '@ui/components/pages/Fuse/FusePoolPage/SupplyList/RewardsInfo';
import PoolModal from '@ui/components/pages/Fuse/Modals/PoolModal/index';
import ClaimAssetRewardsButton from '@ui/components/shared/ClaimAssetRewardsButton';
import { CTokenIcon, TokenWithLabel } from '@ui/components/shared/CTokenIcon';
import { Row } from '@ui/components/shared/Flex';
import { PopoverTooltip } from '@ui/components/shared/PopoverTooltip';
import { SimpleTooltip } from '@ui/components/shared/SimpleTooltip';
import { SwitchCSS } from '@ui/components/shared/SwitchCSS';
import { DOWN_LIMIT, UP_LIMIT, URL_MIDAS_DOCS } from '@ui/constants/index';
import { useMidas } from '@ui/context/MidasContext';
import { useColors } from '@ui/hooks/useColors';
import { usePluginInfo } from '@ui/hooks/usePluginInfo';
import { useIsMobile } from '@ui/hooks/useScreenSize';
import { useErrorToast, useInfoToast } from '@ui/hooks/useToast';
import { useTokenData } from '@ui/hooks/useTokenData';
import { MarketData } from '@ui/types/TokensDataMap';
import { aprFormatter, smallUsdFormatter, tokenFormatter } from '@ui/utils/bigUtils';
import { errorCodeToMessage } from '@ui/utils/errorCodeToMessage';
import { getBlockTimePerMinuteByChainId } from '@ui/utils/networkData';

interface AssetSupplyRowProps {
  assets: MarketData[];
  index: number;
  comptrollerAddress: string;
  rewards: FlywheelMarketRewardsInfo[];
}
export const AssetSupplyRow = ({
  assets,
  index,
  comptrollerAddress,
  rewards = [],
}: AssetSupplyRowProps) => {
  const { isOpen: isModalOpen, onOpen: openModal, onClose: closeModal } = useDisclosure();

  const asset = assets[index];
  const { midasSdk, scanUrl, currentChain, setPendingTxHash } = useMidas();
  const { data: tokenData } = useTokenData(asset.underlyingToken);
  const supplyAPY = midasSdk.ratePerBlockToAPY(
    asset.supplyRatePerBlock,
    getBlockTimePerMinuteByChainId(currentChain.id)
  );
  const errorToast = useErrorToast();
  const infoToast = useInfoToast();

  const { cCard, cSwitch } = useColors();
  const isMobile = useIsMobile();

  const rewardsOfThisMarket = useMemo(
    () => rewards.find((r) => r.market === asset.cToken),
    [asset.cToken, rewards]
  );

  const { data: pluginInfo } = usePluginInfo(asset.plugin);

  const onToggleCollateral = async () => {
    const comptroller = midasSdk.createComptroller(comptrollerAddress);

    let call: ContractTransaction;
    if (asset.membership) {
      const exitCode = await comptroller.callStatic.exitMarket(asset.cToken);
      if (!exitCode.eq(0)) {
        infoToast({
          title: 'Cannot Remove Collateral',
          description: errorCodeToMessage(exitCode.toNumber()),
        });
        return;
      }
      call = await comptroller.exitMarket(asset.cToken);
    } else {
      call = await comptroller.enterMarkets([asset.cToken]);
    }

    if (!call) {
      if (asset.membership) {
        errorToast({
          title: 'Error! Code: ' + call,
          description:
            'You cannot disable this asset as collateral as you would not have enough collateral posted to keep your borrow. Try adding more collateral of another type or paying back some of your debt.',
        });
      } else {
        errorToast({
          title: 'Error! Code: ' + call,
          description: 'You cannot enable this asset as collateral at this time.',
        });
      }

      return;
    }

    setPendingTxHash(call.hash);

    LogRocket.track('Fuse-ToggleCollateral');
  };

  return (
    <>
      <Tr style={{ position: 'absolute' }}>
        <Td>
          <PoolModal
            defaultMode={FundOperationMode.SUPPLY}
            comptrollerAddress={comptrollerAddress}
            assets={assets}
            index={index}
            isOpen={isModalOpen}
            onClose={closeModal}
          />
        </Td>
      </Tr>

      <Tr
        verticalAlign="middle"
        _hover={{
          bgColor: cCard.hoverBgColor,
        }}
      >
        <Td cursor={'pointer'} onClick={openModal} pr={0}>
          <Row mainAxisAlignment="flex-start" crossAxisAlignment="center">
            <CTokenIcon size="sm" address={asset.underlyingToken} />
            <VStack alignItems={'flex-start'} ml={2}>
              <PopoverTooltip
                placement="top-start"
                body={
                  <div
                    dangerouslySetInnerHTML={{ __html: asset.extraDocs || asset.underlyingSymbol }}
                  />
                }
              >
                <Text
                  fontWeight="bold"
                  textAlign={'left'}
                  fontSize={{ base: '2.8vw', sm: '0.9rem' }}
                >
                  {tokenData?.symbol ?? asset.underlyingSymbol}
                </Text>
              </PopoverTooltip>
              <PopoverTooltip
                placement="top-start"
                body={
                  'The Loan to Value (LTV) ratio defines the maximum amount of tokens in the pool that can be borrowed with a specific collateral. It’s expressed in percentage: if in a pool ETH has 75% LTV, for every 1 ETH worth of collateral, borrowers will be able to borrow 0.75 ETH worth of other tokens in the pool.'
                }
              >
                <Text
                  textAlign={'left'}
                  color={cCard.txtColor}
                  fontSize={{ base: '2.8vw', sm: '0.8rem' }}
                >
                  {utils.formatUnits(asset.collateralFactor, 16)}% LTV
                </Text>
              </PopoverTooltip>
            </VStack>

            <HStack ml={2}>
              {asset.underlyingSymbol &&
                tokenData?.symbol &&
                asset.underlyingSymbol.toLowerCase() !== tokenData?.symbol?.toLowerCase() && (
                  <PopoverTooltip body={asset.underlyingSymbol}>
                    <QuestionIcon />
                  </PopoverTooltip>
                )}
              <Box>
                <PopoverTooltip
                  placement="top-start"
                  body={`${scanUrl}/address/${asset.underlyingToken}`}
                >
                  <Button
                    minWidth={6}
                    m={0}
                    variant={'link'}
                    as={ChakraLink}
                    href={`${scanUrl}/address/${asset.underlyingToken}`}
                    isExternal
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <LinkIcon h={{ base: 3, sm: 6 }} color={cCard.txtColor} />
                  </Button>
                </PopoverTooltip>
              </Box>

              {asset.plugin && (
                <Box>
                  <PopoverTooltip
                    placement="top-start"
                    body={
                      <>
                        This market is using the <b>{pluginInfo?.name}</b> ERC4626 Strategy.
                        <br />
                        Read more about it{' '}
                        <ChakraLink
                          href={URL_MIDAS_DOCS}
                          isExternal
                          variant={'color'}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          in our Docs <ExternalLinkIcon mx="2px" />
                        </ChakraLink>
                        .
                      </>
                    }
                  >
                    <span role="img" aria-label="plugin" style={{ fontSize: 18 }}>
                      🔌
                    </span>
                  </PopoverTooltip>
                </Box>
              )}
            </HStack>
          </Row>
        </Td>

        <Td px={1}>
          <ClaimAssetRewardsButton poolAddress={comptrollerAddress} assetAddress={asset.cToken} />
        </Td>

        {!isMobile && (
          <Td
            cursor={'pointer'}
            onClick={openModal}
            isNumeric
            verticalAlign={'top'}
            textAlign={'right'}
          >
            <VStack alignItems={'flex-end'}>
              <Text color={cCard.txtColor} fontWeight="bold" fontSize={{ base: '2.8vw', sm: 'md' }}>
                {supplyAPY.toFixed(2)}%
              </Text>

              {rewardsOfThisMarket?.rewardsInfo && rewardsOfThisMarket?.rewardsInfo.length !== 0 ? (
                rewardsOfThisMarket?.rewardsInfo.map((info) =>
                  asset.plugin ? (
                    <RewardsInfo
                      key={info.rewardToken}
                      underlyingAddress={asset.underlyingToken}
                      pluginAddress={asset.plugin}
                      rewardAddress={info.rewardToken}
                    />
                  ) : (
                    <HStack key={info.rewardToken} justifyContent={'flex-end'} spacing={0}>
                      <HStack mr={2}>
                        <Text fontSize={{ base: '3.2vw', sm: '0.9rem' }}>+</Text>
                        <TokenWithLabel address={info.rewardToken} size="2xs" />
                      </HStack>
                      {info.formattedAPR && (
                        <Text
                          color={cCard.txtColor}
                          fontSize={{ base: '2.8vw', sm: '0.8rem' }}
                          ml={1}
                        >
                          {aprFormatter(info.formattedAPR)}%
                        </Text>
                      )}
                    </HStack>
                  )
                )
              ) : asset.plugin ? (
                <RewardsInfo
                  underlyingAddress={asset.underlyingToken}
                  pluginAddress={asset.plugin}
                />
              ) : null}
            </VStack>
          </Td>
        )}

        <Td
          cursor={'pointer'}
          onClick={openModal}
          isNumeric
          textAlign={'right'}
          verticalAlign={'top'}
        >
          <VStack alignItems="flex-end">
            <SimpleTooltip
              label={asset.supplyBalanceFiat.toString()}
              isDisabled={
                asset.supplyBalanceFiat === DOWN_LIMIT || asset.supplyBalanceFiat >= UP_LIMIT
              }
            >
              <Text color={cCard.txtColor} fontWeight="bold" fontSize={{ base: '2.8vw', sm: 'md' }}>
                {smallUsdFormatter(asset.supplyBalanceFiat)}
                {asset.supplyBalanceFiat > DOWN_LIMIT && asset.supplyBalanceFiat < UP_LIMIT && '+'}
              </Text>
            </SimpleTooltip>
            <SimpleTooltip
              label={utils.formatUnits(asset.supplyBalance, asset.underlyingDecimals)}
              isDisabled={
                Number(utils.formatUnits(asset.supplyBalance, asset.underlyingDecimals)) ===
                  DOWN_LIMIT ||
                Number(utils.formatUnits(asset.supplyBalance, asset.underlyingDecimals)) >= UP_LIMIT
              }
            >
              <Text color={cCard.txtColor} mt={1} fontSize={{ base: '2.8vw', sm: '0.8rem' }}>
                {tokenFormatter(asset.supplyBalance, asset.underlyingDecimals)}
                {Number(utils.formatUnits(asset.supplyBalance, asset.underlyingDecimals)) >
                  DOWN_LIMIT &&
                  Number(utils.formatUnits(asset.supplyBalance, asset.underlyingDecimals)) <
                    UP_LIMIT &&
                  '+'}{' '}
                {tokenData?.extraData?.shortName ?? tokenData?.symbol ?? asset.underlyingSymbol}
              </Text>
            </SimpleTooltip>
          </VStack>
        </Td>

        <Td verticalAlign={'middle'}>
          <Row mainAxisAlignment={'center'} crossAxisAlignment="center">
            <SwitchCSS symbol={asset.underlyingSymbol} color={cSwitch.bgColor} />
            <Switch
              isChecked={asset.membership}
              className={'switch-' + asset.underlyingSymbol}
              onChange={onToggleCollateral}
              size={isMobile ? 'sm' : 'md'}
              cursor={'pointer'}
            />
          </Row>
        </Td>
      </Tr>
    </>
  );
};