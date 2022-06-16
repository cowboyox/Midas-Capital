import { BigNumber } from "ethers";

import { SupportedChains } from "../enums";
import { ChainSpecificParams } from "../types";

const chainSpecificParams: ChainSpecificParams = {
  [SupportedChains.ganache]: {
    blocksPerYear: BigNumber.from((5 * 24 * 365 * 60).toString()),
  },
  [SupportedChains.chapel]: {
    blocksPerYear: BigNumber.from((20 * 24 * 365 * 60).toString()),
  },
  [SupportedChains.bsc]: {
    blocksPerYear: BigNumber.from((20 * 24 * 365 * 60).toString()),
  },
  // TODO: not sure if this is correct
  [SupportedChains.evmos_testnet]: {
    blocksPerYear: BigNumber.from((10 * 24 * 365 * 60).toString()),
  },
  [SupportedChains.evmos]: {
    blocksPerYear: BigNumber.from((10 * 24 * 365 * 60).toString()),
  },
  [SupportedChains.moonbeam]: {
    blocksPerYear: BigNumber.from((5 * 24 * 365 * 60).toString()),
  },
  [SupportedChains.moonbase_alpha]: {
    blocksPerYear: BigNumber.from((5 * 24 * 365 * 60).toString()),
  },
  [SupportedChains.aurora]: {
    blocksPerYear: BigNumber.from((50 * 24 * 365 * 60).toString()),
  },
  // TODO: fix
  [SupportedChains.neon_devnet]: {
    blocksPerYear: BigNumber.from((5 * 24 * 365 * 60).toString()),
  },
};

export default chainSpecificParams;
