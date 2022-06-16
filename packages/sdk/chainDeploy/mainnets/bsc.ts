import { ethers } from "ethers";

import { AddressesProvider } from "../../lib/contracts/typechain/AddressesProvider";
import { SupportedChains } from "../../src";
import { assetSymbols, chainSupportedAssets } from "../../src/chainConfig";
import { ChainDeployConfig, ChainlinkFeedBaseCurrency, deployChainlinkOracle, deployUniswapOracle } from "../helpers";
import { deployERC4626Plugin, deployFlywheelWithDynamicRewards } from "../helpers/erc4626Plugins";
import { ChainDeployFnParams, ChainlinkAsset, CurvePoolConfig } from "../helpers/types";
import { deployCurveLpOracle } from "../oracles/curveLp";
import { deployUniswapLpOracle } from "../oracles/uniswapLp";

const assets = chainSupportedAssets[SupportedChains.bsc];
const wbnb = assets.find((a) => a.symbol === assetSymbols.WBNB)!.underlying;

export const deployConfig: ChainDeployConfig = {
  wtoken: wbnb,
  nativeTokenUsdChainlinkFeed: "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
  nativeTokenName: "Binance Network Token",
  nativeTokenSymbol: "BNB",
  stableToken: assets.find((a) => a.symbol === assetSymbols.BUSD)!.underlying,
  wBTCToken: assets.find((a) => a.symbol === assetSymbols.BTCB)!.underlying,
  blocksPerYear: 20 * 24 * 365 * 60,
  uniswap: {
    hardcoded: [],
    uniswapData: [
      {
        lpDisplayName: "PancakeSwap",
        lpName: "Pancake LPs",
        lpSymbol: "Cake-LP",
      },
    ],
    pairInitHashCode: ethers.utils.hexlify("0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5"),
    uniswapV2RouterAddress: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    uniswapV2FactoryAddress: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
    uniswapOracleInitialDeployTokens: [
      {
        token: assets.find((a) => a.symbol === assetSymbols.BOMB)!.underlying,
        baseToken: assets.find((a) => a.symbol === assetSymbols.BTCB)!.underlying,
      },
    ],
    uniswapOracleLpTokens: [
      assets.find((a) => a.symbol === assetSymbols["BTCB-BOMB"])!.underlying, // BOMB-BTC PCS LP
      assets.find((a) => a.symbol === assetSymbols["WBNB-DAI"])!.underlying, // WBNB-DAI PCS LP
      assets.find((a) => a.symbol === assetSymbols["WBNB-BUSD"])!.underlying, // WBNB-BUSD PCS LP
      assets.find((a) => a.symbol === assetSymbols["WBNB-USDC"])!.underlying, // WBNB-USDC PCS LP
    ],
  },
  plugins: [
    {
      // 0x
      strategy: "BeefyERC4626",
      name: "BOMBBTCLP",
      underlying: assets.find((a) => a.symbol === assetSymbols["BTCB-BOMB"])!.underlying,
      otherParams: ["0x94e85b8e050f3f281cb9597cc0144f1f7af1fe9b"], // Beefy Vault Address
    },
    {
      // 0x
      strategy: "BombERC4626",
      underlying: assets.find((a) => a.symbol === assetSymbols.BOMB)!.underlying, // BOMB
      otherParams: [assets.find((a) => a.symbol === assetSymbols.xBOMB)!.underlying], // xBOMB
      name: "BOMBxBOMB",
    },
    {
      // 0x
      strategy: "AutofarmERC4626",
      underlying: assets.find((a) => a.symbol === assetSymbols.AUTO)!.underlying, // AUTO
      otherParams: ["0", "0xa184088a740c695E156F91f5cC086a06bb78b827", "0x0895196562C7868C5Be92459FaE7f877ED450452"], // poolId, AUTO, AutofarmV2 (Vault Handler)
      flywheelIndices: [2],
      name: "AUTO",
    },
    {
      // 0x
      strategy: "DotDotLpERC4626",
      underlying: assets.find((a) => a.symbol === assetSymbols["3EPS"])!.underlying, // 3EPS
      otherParams: ["0x8189F0afdBf8fE6a9e13c69bA35528ac6abeB1af"], // lpDepositor
      flywheelIndices: [0, 1],
      name: "3EPS",
    },
    {
      // 0x
      strategy: "DotDotLpERC4626",
      underlying: assets.find((a) => a.symbol === assetSymbols["dai3EPS"])!.underlying, // dai3EPS
      otherParams: ["0x8189F0afdBf8fE6a9e13c69bA35528ac6abeB1af"], // lpDepositor
      flywheelIndices: [0, 1],
      name: "dai3EPS",
    },
    {
      // 0x
      strategy: "DotDotLpERC4626",
      underlying: assets.find((a) => a.symbol === assetSymbols["2brl"])!.underlying, // 2BRL
      otherParams: ["0x8189F0afdBf8fE6a9e13c69bA35528ac6abeB1af"], // lpDepositor
      flywheelIndices: [0, 1],
      name: "2brl",
    },
    // All of these vaults are depricated
    /*{
      // 0x
      strategy: "AutofarmERC4626",
      underlying: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
      otherParams: [ "1","0xa184088a740c695E156F91f5cC086a06bb78b827", "0x0895196562C7868C5Be92459FaE7f877ED450452"], // poolId, AUTO, AutofarmV2 (Vault Handler)
      flywheelIndices: [2]
    },
    {
      // 0x
      strategy: "AutofarmERC4626",
      underlying: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", // BUSD
      otherParams: [ "2","0xa184088a740c695E156F91f5cC086a06bb78b827", "0x0895196562C7868C5Be92459FaE7f877ED450452"], // poolId, AUTO, AutofarmV2 (Vault Handler)
      flywheelIndices: [2]
    },
    {
      // 0x
      strategy: "AutofarmERC4626",
      underlying: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", // BTCB
      otherParams: [ "3","0xa184088a740c695E156F91f5cC086a06bb78b827", "0x0895196562C7868C5Be92459FaE7f877ED450452"], // poolId, AUTO, AutofarmV2 (Vault Handler)
     flywheelIndices: [2]
    },
    {
      // 0x
      strategy: "AutofarmERC4626",
      underlying: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", // BETH
      otherParams: [ "4","0xa184088a740c695E156F91f5cC086a06bb78b827", "0x0895196562C7868C5Be92459FaE7f877ED450452"], // poolId, AUTO, AutofarmV2 (Vault Handler)
      flywheelIndices: [2]
    }, */
    {
      // 0x
      strategy: "AlpacaERC4626",
      underlying: wbnb, // WBNB
      otherParams: [
        "0xd7D069493685A581d27824Fc46EdA46B7EfC0063", // ibWBNB
        wbnb,
      ],
      name: "WBNB",
    },
    {
      // 0x
      strategy: "AlpacaERC4626",
      underlying: assets.find((a) => a.symbol === assetSymbols.ETH)!.underlying, // ETH
      otherParams: [
        "0xbfF4a34A4644a113E8200D7F1D79b3555f723AfE", // ibETH
        wbnb,
      ],
      name: "ETH",
    },
    {
      // 0x
      strategy: "AlpacaERC4626",
      underlying: assets.find((a) => a.symbol === assetSymbols.BUSD)!.underlying, // BUSD
      otherParams: [
        "0x7C9e73d4C71dae564d41F78d56439bB4ba87592f", // ibBUSD
        wbnb,
      ],
      name: "BUSD",
    },
    {
      // 0x
      strategy: "AlpacaERC4626",
      underlying: assets.find((a) => a.symbol === assetSymbols.USDT)!.underlying, // USDT
      otherParams: [
        "0x158Da805682BdC8ee32d52833aD41E74bb951E59", // ibUSDT
        wbnb,
      ],
      name: "USDT",
    },
    {
      // 0x
      strategy: "AlpacaERC4626",
      underlying: assets.find((a) => a.symbol === assetSymbols.USDC)!.underlying, // USDC
      otherParams: [
        "0x800933D685E7Dc753758cEb77C8bd34aBF1E26d7", // ibUSDC
        wbnb,
      ],
      name: "USDC",
    },
    {
      // 0x
      strategy: "AlpacaERC4626",
      underlying: assets.find((a) => a.symbol === assetSymbols.TUSD)!.underlying, // TUSD
      otherParams: [
        "0x3282d2a151ca00BfE7ed17Aa16E42880248CD3Cd", // ibTUSD
        wbnb,
      ],
      name: "TUSD",
    },
    {
      // 0x
      strategy: "AlpacaERC4626",
      underlying: assets.find((a) => a.symbol === assetSymbols.BTCB)!.underlying, // BTCB
      otherParams: [
        "0x08FC9Ba2cAc74742177e0afC3dC8Aed6961c24e7", // ibBTCB
        wbnb,
      ],
      name: "BTCB",
    },
  ],
  dynamicFlywheels: [
    {
      rewardToken: "0x84c97300a190676a19D1E13115629A11f8482Bd1",
      cycleLength: 1,
      name: "DDD",
    },
    {
      rewardToken: "0xaf41054c1487b0e5e2b9250c0332ecbce6ce9d71",
      cycleLength: 1,
      name: "EPX",
    },
    {
      rewardToken: "0xa184088a740c695E156F91f5cC086a06bb78b827",
      cycleLength: 1,
      name: "AUTOv2",
    },
  ],
};

const chainlinkAssets: ChainlinkAsset[] = [
  //
  {
    symbol: assetSymbols.BUSD,
    aggregator: "0xcBb98864Ef56E9042e7d2efef76141f15731B82f",
    feedBaseCurrency: ChainlinkFeedBaseCurrency.USD,
  },
  {
    symbol: assetSymbols.BTCB,
    aggregator: "0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf",
    feedBaseCurrency: ChainlinkFeedBaseCurrency.USD,
  },
  {
    symbol: assetSymbols.DAI,
    aggregator: "0x132d3C0B1D2cEa0BC552588063bdBb210FDeecfA",
    feedBaseCurrency: ChainlinkFeedBaseCurrency.USD,
  },
  {
    symbol: assetSymbols.ETH,
    aggregator: "0x63D407F32Aa72E63C7209ce1c2F5dA40b3AaE726",
    feedBaseCurrency: ChainlinkFeedBaseCurrency.USD,
  },
  // CZ
  {
    symbol: assetSymbols.BETH,
    aggregator: "0x2A3796273d47c4eD363b361D3AEFb7F7E2A13782",
    feedBaseCurrency: ChainlinkFeedBaseCurrency.USD,
  },
  {
    symbol: assetSymbols.CAKE,
    aggregator: "0xB6064eD41d4f67e353768aA239cA86f4F73665a1",
    feedBaseCurrency: ChainlinkFeedBaseCurrency.USD,
  },
  //
  {
    symbol: assetSymbols.AUTO,
    aggregator: "0x88E71E6520E5aC75f5338F5F0c9DeD9d4f692cDA",
    feedBaseCurrency: ChainlinkFeedBaseCurrency.USD,
  },
  {
    symbol: assetSymbols.BIFI,
    aggregator: "0xaB827b69daCd586A37E80A7d552a4395d576e645",
    feedBaseCurrency: ChainlinkFeedBaseCurrency.USD,
  },
  // stables
  {
    symbol: assetSymbols.USDC,
    aggregator: "0x51597f405303C4377E36123cBc172b13269EA163",
    feedBaseCurrency: ChainlinkFeedBaseCurrency.USD,
  },
  {
    symbol: assetSymbols.USDT,
    aggregator: "0xB97Ad0E74fa7d920791E90258A6E2085088b4320",
    feedBaseCurrency: ChainlinkFeedBaseCurrency.USD,
  },
  // Jarvis
  {
    symbol: assetSymbols.jBRL,
    aggregator: "0x5cb1Cb3eA5FB46de1CE1D0F3BaDB3212e8d8eF48",
    feedBaseCurrency: ChainlinkFeedBaseCurrency.USD,
  },
  {
    symbol: assetSymbols.BRZ,
    aggregator: "0x5cb1Cb3eA5FB46de1CE1D0F3BaDB3212e8d8eF48",
    feedBaseCurrency: ChainlinkFeedBaseCurrency.USD,
  },
  {
    symbol: assetSymbols.ALPACA,
    aggregator: "0xe0073b60833249ffd1bb2af809112c2fbf221df6",
    feedBaseCurrency: ChainlinkFeedBaseCurrency.USD,
  },
];

// https://docs.ellipsis.finance/deployment-links
const curvePools: CurvePoolConfig[] = [
  {
    // 3EPS
    lpToken: assets.find((a) => a.symbol === assetSymbols["3EPS"])!.underlying,
    pool: "0x160CAed03795365F3A589f10C379FfA7d75d4E76",
    underlyings: [
      assets.find((a) => a.symbol === assetSymbols.BUSD)!.underlying,
      assets.find((a) => a.symbol === assetSymbols.USDC)!.underlying,
      assets.find((a) => a.symbol === assetSymbols.USDT)!.underlying,
    ],
  },
  {
    // dai3EPS metapool
    lpToken: assets.find((a) => a.symbol === assetSymbols.dai3EPS)!.underlying,
    pool: "0xc6a752948627bECaB5474a10821Df73fF4771a49",
    underlyings: [
      assets.find((a) => a.symbol === assetSymbols.DAI)!.underlying,
      assets.find((a) => a.symbol === assetSymbols["3EPS"])!.underlying,
    ],
  },
  {
    // 2BRL pool
    lpToken: assets.find((a) => a.symbol === assetSymbols["2brl"])!.underlying,
    pool: "0xad51e40D8f255dba1Ad08501D6B1a6ACb7C188f3",
    underlyings: [
      assets.find((a) => a.symbol === assetSymbols.jBRL)!.underlying,
      assets.find((a) => a.symbol === assetSymbols.BRZ)!.underlying,
    ],
  },
];

export const deploy = async ({ run, ethers, getNamedAccounts, deployments }: ChainDeployFnParams): Promise<void> => {
  const { deployer } = await getNamedAccounts();
  ////
  //// ORACLES

  //// ChainLinkV2 Oracle
  await deployChainlinkOracle({
    run,
    ethers,
    getNamedAccounts,
    deployments,
    deployConfig,
    assets: assets,
    chainlinkAssets,
  });
  ////

  //// Uniswap Oracle
  await deployUniswapOracle({
    run,
    ethers,
    getNamedAccounts,
    deployments,
    deployConfig,
  });
  ////

  await deployUniswapLpOracle({
    run,
    ethers,
    getNamedAccounts,
    deployments,
    deployConfig,
  });

  await deployCurveLpOracle({
    run,
    ethers,
    getNamedAccounts,
    deployments,
    deployConfig,
    curvePools,
  });

  const simplePO = await deployments.deploy("SimplePriceOracle", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });
  if (simplePO.transactionHash) await ethers.provider.waitForTransaction(simplePO.transactionHash);
  console.log("SimplePriceOracle: ", simplePO.address);

  //// Liquidator Redemption Strategies
  const uniswapLpTokenLiquidator = await deployments.deploy("UniswapLpTokenLiquidator", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });
  if (uniswapLpTokenLiquidator.transactionHash) {
    await ethers.provider.waitForTransaction(uniswapLpTokenLiquidator.transactionHash);
  }
  console.log("UniswapLpTokenLiquidator: ", uniswapLpTokenLiquidator.address);

  //// Liquidator Redemption Strategies
  /// xBOMB->BOMB
  const xbombLiquidator = await deployments.deploy("XBombLiquidator", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });
  if (xbombLiquidator.transactionHash) await ethers.provider.waitForTransaction(xbombLiquidator.transactionHash);
  console.log("XBombLiquidator: ", xbombLiquidator.address);

  /// jBRL->BUSD
  // TODO in the addresses provider?
  const synthereumLiquidityPoolAddress = "0x0fD8170Dc284CD558325029f6AEc1538c7d99f49";
  const expirationTime = 40 * 60; // period in which the liquidation tx is valid to be included in a block, in seconds
  const jarvisSynthereumLiquidator = await deployments.deploy("JarvisSynthereumLiquidator", {
    from: deployer,
    args: [synthereumLiquidityPoolAddress, expirationTime],
    log: true,
    waitConfirmations: 1,
  });
  if (jarvisSynthereumLiquidator.transactionHash)
    await ethers.provider.waitForTransaction(jarvisSynthereumLiquidator.transactionHash);
  console.log("JarvisSynthereumLiquidator: ", jarvisSynthereumLiquidator.address);

  /// EPS
  const curveOracle = await ethers.getContract("CurveLpTokenPriceOracleNoRegistry", deployer);
  const curveLpTokenLiquidatorNoRegistry = await deployments.deploy("CurveLpTokenLiquidatorNoRegistry", {
    from: deployer,
    args: [deployConfig.wtoken, curveOracle.address],
    log: true,
    waitConfirmations: 1,
  });
  if (curveLpTokenLiquidatorNoRegistry.transactionHash)
    await ethers.provider.waitForTransaction(curveLpTokenLiquidatorNoRegistry.transactionHash);
  console.log("CurveLpTokenLiquidatorNoRegistry: ", curveLpTokenLiquidatorNoRegistry.address);

  ////

  // Plugins & Rewards
  const dynamicFlywheels = await deployFlywheelWithDynamicRewards({
    ethers,
    getNamedAccounts,
    deployments,
    run,
    deployConfig,
  });
  console.log("deployed dynamicFlywheels: ", dynamicFlywheels);
  await deployERC4626Plugin({
    ethers,
    getNamedAccounts,
    deployments,
    run,
    deployConfig,
    dynamicFlywheels,
  });

  /// Addresses Provider - set bUSD
  const addressesProvider = (await ethers.getContract("AddressesProvider", deployer)) as AddressesProvider;
  const tx = await addressesProvider.setAddress("bUSD", assets.find((a) => a.symbol === assetSymbols.BUSD)!.underlying);
  await tx.wait();
  console.log("setAddress: ", tx.hash);
  ////

  console.log(`total gas used for deployments ${deployments.getGasUsed()}`);
};