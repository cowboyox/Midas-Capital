import { NativePricedFuseAsset } from '@midas-capital/types';
import { useQuery } from '@tanstack/react-query';
import { constants, utils } from 'ethers';

import { useSdk } from '@ui/hooks/fuse/useSdk';

export const useDebtCeilingForAssetForCollateral = ({
  assets,
  collaterals,
  comptroller: comptrollerAddress,
  poolChainId,
}: {
  assets: NativePricedFuseAsset[];
  collaterals: NativePricedFuseAsset[];
  comptroller: string;
  poolChainId: number;
}) => {
  const sdk = useSdk(poolChainId);

  return useQuery(
    [
      'useDebtCeilingForAssetForCollateral',
      poolChainId,
      assets.map((asset) => asset.cToken).sort(),
      collaterals.map((asset) => asset.cToken).sort(),
    ],
    async () => {
      if (!sdk || collaterals.length === 0) return null;

      const debtCeilingPerCollateral: {
        asset: NativePricedFuseAsset;
        collateralAsset: NativePricedFuseAsset;
        debtCeiling: number;
      }[] = [];
      const comptroller = sdk.createComptroller(comptrollerAddress, sdk.provider);

      await Promise.all(
        assets.map(async (asset) => {
          await Promise.all(
            collaterals.map(async (collateralAsset) => {
              if (asset.cToken !== collateralAsset.cToken) {
                const isInBlackList =
                  await comptroller.callStatic.borrowingAgainstCollateralBlacklist(
                    asset.cToken,
                    collateralAsset.cToken
                  );

                if (isInBlackList) {
                  debtCeilingPerCollateral.push({
                    asset,
                    collateralAsset,
                    debtCeiling: -1,
                  });
                } else {
                  const debtCeiling = await comptroller.callStatic.borrowCapForCollateral(
                    asset.cToken,
                    collateralAsset.cToken
                  );

                  if (debtCeiling.gt(constants.Zero)) {
                    debtCeilingPerCollateral.push({
                      asset,
                      collateralAsset,
                      debtCeiling: Number(utils.formatUnits(debtCeiling, asset.underlyingDecimals)),
                    });
                  }
                }
              }
            })
          );
        })
      );

      return debtCeilingPerCollateral;
    },
    { cacheTime: Infinity, staleTime: Infinity, enabled: !!sdk && collaterals.length > 0 }
  );
};