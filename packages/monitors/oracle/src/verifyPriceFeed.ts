import { Fuse, OracleTypes, SupportedAsset } from "@midas-capital/sdk";
import { BigNumber, ethers, Wallet } from "ethers";

import { logger, SupportedAssetPriceFeed } from "./index";

export default async function verifyPriceFeed(fuse: Fuse, asset: SupportedAsset): Promise<SupportedAssetPriceFeed> {
  const oracle = asset.oracle;
  if (!oracle) {
    return {
      asset,
      valid: true,
      price: BigNumber.from(1),
    };
  }
  const signer = new Wallet(process.env.ETHEREUM_ADMIN_PRIVATE_KEY!, fuse.provider);

  logger.info(`Fetching price for ${asset.underlying} (${asset.symbol})`);
  const mpo = fuse.createMasterPriceOracle(signer);
  const mpoPrice = await mpo.callStatic.price(asset.underlying);
  const underlyingOracleAddress = await mpo.callStatic.oracles(asset.underlying);

  const underlyingOracle = await fuse.createOracle(underlyingOracleAddress, oracle, signer);
  const underlyingOraclePrice = await underlyingOracle.callStatic.price(asset.underlying);
  if (!mpoPrice.eq(underlyingOraclePrice)) {
    throw "Oracle prices out of sync";
  }
  let valid = true;
  let price: BigNumber = BigNumber.from(0);

  switch (oracle) {
    case OracleTypes.ChainlinkPriceOracleV2:
    case OracleTypes.DiaPriceOracle:
    case OracleTypes.FluxPriceOracle:
      ({ price, valid } = await verifyOracleProviderPriceFeed(mpoPrice, underlyingOraclePrice));
      break;
    case OracleTypes.UniswapTwapPriceOracleV2:
      ({ price, valid } = await verifyTwapPriceFeed(mpoPrice, underlyingOraclePrice));
      break;
    case OracleTypes.FixedNativePriceOracle:
      if (!underlyingOraclePrice.eq(ethers.utils.parseEther("1"))) {
        price = underlyingOraclePrice;
        valid = false;
      }
      break;
    default:
      price = underlyingOraclePrice;
      valid = true;
      break;
  }
  return {
    asset,
    valid,
    price,
  };
}

async function verifyOracleProviderPriceFeed(mpoPrice: BigNumber, oraclePrice: BigNumber) {
  // TODO
  if (mpoPrice !== oraclePrice) {
    return { price: oraclePrice, valid: false };
  }
  return { price: oraclePrice, valid: true };
}

async function verifyTwapPriceFeed(mpoPrice: BigNumber, oraclePrice: BigNumber) {
  // TODO
  if (mpoPrice !== oraclePrice) {
    return { price: oraclePrice, valid: false };
  }
  return { price: oraclePrice, valid: true };
}