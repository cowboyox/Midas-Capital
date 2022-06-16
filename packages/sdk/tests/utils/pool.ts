// pool utilities used across downstream tests
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { providers, utils } from "ethers";
import { ethers } from "hardhat";

import { Fuse, FusePoolData, MarketConfig, NativePricedFuseAsset } from "../../src";

import { getOrCreateFuse } from "./fuseSdk";

interface PoolCreationParams {
  closeFactor?: number;
  liquidationIncentive?: number;
  poolName?: string;
  enforceWhitelist?: boolean;
  whitelist?: Array<string>;
  priceOracleAddress?: string | null;
  signer?: SignerWithAddress | null;
}

export async function createPool({
  closeFactor = 50,
  liquidationIncentive = 8,
  poolName = `TEST - ${Math.random()}`,
  enforceWhitelist = false,
  whitelist = [],
  priceOracleAddress = null,
  signer = null,
}: PoolCreationParams) {
  const sdk = await getOrCreateFuse();

  if (!signer) {
    const { bob } = await ethers.getNamedSigners();
    signer = bob;
  }
  if (!priceOracleAddress) {
    const mpo = await ethers.getContractAt("MasterPriceOracle", sdk.oracles.MasterPriceOracle.address, signer);
    priceOracleAddress = mpo.address;
  }
  if (enforceWhitelist && whitelist.length === 0) {
    throw "If enforcing whitelist, a whitelist array of addresses must be provided";
  }

  // 50% -> 0.5 * 1e18
  const bigCloseFactor = utils.parseEther((closeFactor / 100).toString());
  // 8% -> 1.08 * 1e8
  const bigLiquidationIncentive = utils.parseEther((liquidationIncentive / 100 + 1).toString());

  return await sdk.deployPool(
    poolName,
    enforceWhitelist,
    bigCloseFactor,
    bigLiquidationIncentive,
    priceOracleAddress,
    {},
    { from: signer.address },
    whitelist
  );
}

export type DeployedAsset = {
  symbol: string;
  underlying: string;
  assetAddress: string;
  implementationAddress: string;
  interestRateModel: string;
  receipt: providers.TransactionReceipt;
};

export async function deployAssets(assets: MarketConfig[], signer?: SignerWithAddress): Promise<DeployedAsset[]> {
  if (!signer) {
    const { bob } = await ethers.getNamedSigners();
    signer = bob;
  }
  const sdk = await getOrCreateFuse();
  const deployed: DeployedAsset[] = [];
  for (const assetConf of assets) {
    console.log("Deploying asset: ", assetConf.name);
    const [assetAddress, implementationAddress, interestRateModel, receipt] = await sdk.deployAsset(
      sdk.JumpRateModelConf,
      assetConf,
      { from: signer.address }
    );
    if (receipt.status !== 1) {
      throw `Failed to deploy asset: ${receipt.logs}`;
    }
    console.log("deployed asset: ", assetConf.name, assetAddress);
    console.log("-----------------");
    deployed.push({
      symbol: assetConf.symbol,
      underlying: assetConf.underlying,
      assetAddress,
      implementationAddress,
      interestRateModel,
      receipt,
    });
  }
  return deployed;
}

export const assetInPool = async (
  poolId: string,
  sdk: Fuse,
  underlyingSymbol: string,
  address?: string
): Promise<NativePricedFuseAsset> => {
  const fetchedAssetsInPool: FusePoolData = await sdk.fetchFusePoolData(poolId, address);
  return fetchedAssetsInPool.assets.filter((a) => a.underlyingSymbol === underlyingSymbol)[0];
};

export const getPoolIndex = async (poolAddress: string, sdk: Fuse) => {
  const [indexes, publicPools] = await sdk.contracts.FusePoolLens.callStatic.getPublicPoolsWithData();
  for (let j = 0; j < publicPools.length; j++) {
    if (publicPools[j].comptroller === poolAddress) {
      return indexes[j];
    }
  }
  return null;
};

export const getPoolByName = async (name: string, sdk: Fuse, address?: string): Promise<FusePoolData> => {
  const [, publicPools] = await sdk.contracts.FusePoolLens.callStatic.getPublicPoolsWithData();
  for (let j = 0; j < publicPools.length; j++) {
    if (publicPools[j].name === name) {
      const poolIndex = await getPoolIndex(publicPools[j].comptroller, sdk);
      return await sdk.fetchFusePoolData(poolIndex.toString(), address);
    }
  }
  return null;
};

export const logPoolData = async (poolAddress, sdk) => {
  const poolIndex = await getPoolIndex(poolAddress, sdk);
  const fusePoolData = await sdk.fetchFusePoolData(poolIndex.toString());
  const poolAssets = fusePoolData.assets.map((a) => a.underlyingSymbol).join(", ");
  console.log(`Operating on pool with address ${poolAddress}, name: ${fusePoolData.name}, assets ${poolAssets}`);
  return fusePoolData;
};