import { assetSymbols, LiquidationDefaults, LiquidationStrategy, SupportedAsset } from "@midas-capital/types";
import { BigNumber, constants } from "ethers";

import { assets } from "./assets";

const liquidationDefaults: LiquidationDefaults = {
  SUPPORTED_OUTPUT_CURRENCIES: [
    constants.AddressZero,
    assets.find((a: SupportedAsset) => a.symbol === assetSymbols.WMATIC)!.underlying,
  ],
  SUPPORTED_INPUT_CURRENCIES: [
    constants.AddressZero,
    assets.find((a: SupportedAsset) => a.symbol === assetSymbols.WMATIC)!.underlying,
  ],
  LIQUIDATION_STRATEGY: LiquidationStrategy.UNISWAP,
  MINIMUM_PROFIT_NATIVE: BigNumber.from(0),
  LIQUIDATION_INTERVAL_SECONDS: 20,
};

export default liquidationDefaults;