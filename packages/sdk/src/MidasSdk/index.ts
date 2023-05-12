import { LogLevel } from "@ethersproject/logger";
import { JsonRpcProvider, Web3Provider } from "@ethersproject/providers";
import {
  ChainAddresses,
  ChainConfig,
  ChainDeployment,
  ChainParams,
  DeployedPlugins,
  FundingStrategyContract,
  InterestRateModel,
  RedemptionStrategyContract,
  SupportedAsset,
  SupportedChains,
} from "@midas-capital/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Contract, Signer, utils } from "ethers";
import {
  Account,
  encodeAbiParameters,
  getAddress,
  getContract,
  keccak256,
  parseAbiParameters,
  PublicClient,
  TransactionReceipt,
  WalletClient,
} from "viem";

import ComptrollerABI from "../../abis/Comptroller";
import CTokenInterfaceABI from "../../abis/CTokenInterface";
import EIP20InterfaceABI from "../../abis/EIP20Interface";
import FuseFeeDistributorABI from "../../abis/FuseFeeDistributor";
import FusePoolDirectoryABI from "../../abis/FusePoolDirectory";
import FusePoolLensABI from "../../abis/FusePoolLens";
import FusePoolLensSecondaryABI from "../../abis/FusePoolLensSecondary";
import FuseSafeLiquidatorABI from "../../abis/FuseSafeLiquidator";
import MidasERC4626ABI from "../../abis/MidasERC4626";
import MidasFlywheelLensRouterABI from "../../abis/MidasFlywheelLensRouter";
import UnitrollerABI from "../../abis/Unitroller";
import { EIP20Interface } from "../../typechain/EIP20Interface";
import { FuseFeeDistributor } from "../../typechain/FuseFeeDistributor";
import { FusePoolDirectory } from "../../typechain/FusePoolDirectory";
import { FusePoolLens } from "../../typechain/FusePoolLens";
import { FusePoolLensSecondary } from "../../typechain/FusePoolLensSecondary";
import { FuseSafeLiquidator } from "../../typechain/FuseSafeLiquidator";
import { MidasERC4626 } from "../../typechain/MidasERC4626";
import { MidasFlywheelLensRouter } from "../../typechain/MidasFlywheelLensRouter";
import { Unitroller } from "../../typechain/Unitroller";
import { withAsset } from "../modules/Asset";
import { withConvertMantissa } from "../modules/ConvertMantissa";
import { withCreateContracts } from "../modules/CreateContracts";
import { withFlywheel } from "../modules/Flywheel";
import { withFundOperations } from "../modules/FundOperations";
import { withFusePoolLens } from "../modules/FusePoolLens";
import { withFusePools } from "../modules/FusePools";
import { ChainLiquidationConfig } from "../modules/liquidation/config";
import { withSafeLiquidator } from "../modules/liquidation/SafeLiquidator";
import { withVaults } from "../modules/Vaults";

import { CTOKEN_ERROR_CODES } from "./config";
import AdjustableAnkrBNBIrm from "./irm/AdjustableAnkrBNBIrm";
import AdjustableJumpRateModel from "./irm/AdjustableJumpRateModel";
import AnkrBNBInterestRateModel from "./irm/AnkrBNBInterestRateModel";
import AnkrFTMInterestRateModel from "./irm/AnkrFTMInterestRateModel";
import JumpRateModel from "./irm/JumpRateModel";
import WhitePaperInterestRateModel from "./irm/WhitePaperInterestRateModel";
import { getPoolAddress, getPoolComptroller, getPoolUnitroller } from "./utils";

utils.Logger.setLogLevel(LogLevel.OFF);

export type WalletOrPublicClient = WalletClient | PublicClient;
export type StaticContracts = {
  [contractName: string]: any;
};

export interface Logger {
  trace(message?: string, ...optionalParams: any[]): void;
  debug(message?: string, ...optionalParams: any[]): void;
  info(message?: string, ...optionalParams: any[]): void;
  warn(message?: string, ...optionalParams: any[]): void;
  error(message?: string, ...optionalParams: any[]): void;
  [x: string]: any;
}

export class MidasBase {
  static CTOKEN_ERROR_CODES = CTOKEN_ERROR_CODES;
  public _publicClient: PublicClient;
  public _walletClient: WalletClient;
  public _account: Account;

  public _contracts: StaticContracts | undefined;
  public chainConfig: ChainConfig;
  public availableOracles: Array<string>;
  public chainId: SupportedChains;
  public chainDeployment: ChainDeployment;
  public chainSpecificAddresses: ChainAddresses;
  public chainSpecificParams: ChainParams;
  public deployedPlugins: DeployedPlugins;
  public marketToPlugin: Record<string, string>;
  public liquidationConfig: ChainLiquidationConfig;
  public supportedAssets: SupportedAsset[];
  public redemptionStrategies: { [token: string]: [RedemptionStrategyContract, string] };
  public fundingStrategies: { [token: string]: [FundingStrategyContract, string] };

  public logger: Logger;

  public get publicClient(): PublicClient {
    return this._publicClient;
  }

  public get walletClient(): WalletClient {
    if (!this._walletClient) {
      throw new Error("No Wallet Client available.");
    }

    return this._walletClient;
  }

  public get account(): Account {
    if (!this._account) {
      throw new Error("No Wallet Account available.");
    }

    return this._account;
  }

  public set contracts(newContracts: Partial<StaticContracts>) {
    this._contracts = { ...this._contracts, ...newContracts } as StaticContracts;
  }

  public get contracts(): StaticContracts {
    return {
      FusePoolDirectory: getContract({
        address: getAddress(this.chainDeployment.FusePoolDirectory.address),
        abi: FusePoolDirectoryABI,
        publicClient: this.publicClient,
      }),
      FusePoolLens: getContract({
        address: getAddress(this.chainDeployment.FusePoolLens.address),
        abi: FusePoolLensABI,
        publicClient: this.publicClient,
      }),
      FusePoolLensSecondary: getContract({
        address: getAddress(this.chainDeployment.FusePoolLensSecondary.address),
        abi: FusePoolLensSecondaryABI,
        publicClient: this.publicClient,
      }),
      FuseSafeLiquidator: getContract({
        address: getAddress(this.chainDeployment.FuseSafeLiquidator.address),
        abi: FuseSafeLiquidatorABI,
        publicClient: this.publicClient,
      }),
      FuseFeeDistributor: getContract({
        address: getAddress(this.chainDeployment.FuseFeeDistributor.address),
        abi: FuseFeeDistributorABI,
        publicClient: this.publicClient,
      }),
      MidasFlywheelLensRouter: getContract({
        address: getAddress(this.chainDeployment.MidasFlywheelLensRouter.address),
        abi: MidasFlywheelLensRouterABI,
        publicClient: this.publicClient,
      }),
      ...this._contracts,
    };
  }

  setClients(publicClient: PublicClient, walletClient: WalletClient | null) {
    this._publicClient = publicClient;

    if (walletClient) {
      this._walletClient = walletClient;

      if (walletClient.account) {
        this._account = walletClient.account;
      }
    }

    return this;
  }

  constructor(
    publicClient: PublicClient,
    walletClient: WalletClient | null,
    chainConfig: ChainConfig,
    logger: Logger = console
  ) {
    this.logger = logger;
    if (!publicClient) throw Error("No Public Client.");

    this._publicClient = publicClient;

    if (walletClient) {
      this._walletClient = walletClient;

      if (walletClient.account) {
        this._account = walletClient.account;
      }
    }

    this.chainConfig = chainConfig;
    this.chainId = chainConfig.chainId;
    this.chainDeployment = chainConfig.chainDeployments;
    this.chainSpecificAddresses = chainConfig.chainAddresses;
    this.chainSpecificParams = chainConfig.specificParams;
    this.liquidationConfig = chainConfig.liquidationDefaults;
    this.supportedAssets = chainConfig.assets;
    this.deployedPlugins = chainConfig.deployedPlugins;
    this.marketToPlugin = Object.entries(this.deployedPlugins).reduce((acc, [plugin, pluginData]) => {
      return { ...acc, [pluginData.market]: plugin };
    }, {});
    this.redemptionStrategies = chainConfig.redemptionStrategies;
    this.fundingStrategies = chainConfig.fundingStrategies;
    this.availableOracles = chainConfig.oracles.filter((o) => {
      if (this.chainDeployment[o] === undefined) {
        this.logger.warn(`Oracle ${o} not deployed to chain ${this.chainId}`);
        return false;
      }
      return true;
    });
  }

  async deployPool(
    poolName: string,
    enforceWhitelist: boolean,
    closeFactor: bigint,
    liquidationIncentive: bigint,
    priceOracle: string, // Contract address
    whitelist: string[] // An array of whitelisted addresses
  ): Promise<[string, string, string, number?]> {
    try {
      // Deploy Comptroller implementation if necessary
      const implementationAddress = this.chainDeployment.Comptroller.address;

      // Register new pool with FusePoolDirectory
      const [account] = await this.walletClient.getAddresses();

      const hash = await this.walletClient.writeContract({
        address: getAddress(this.chainDeployment.FusePoolDirectory.address),
        abi: FusePoolDirectoryABI,
        functionName: "deployPool",
        args: [
          poolName,
          getAddress(implementationAddress),
          encodeAbiParameters(parseAbiParameters("address"), [
            getAddress(this.chainDeployment.FuseFeeDistributor.address),
          ]),
          enforceWhitelist,
          closeFactor,
          liquidationIncentive,
          getAddress(priceOracle),
        ],
        account,
        chain: this.walletClient.chain,
      });

      const receipt: TransactionReceipt = await this.publicClient.waitForTransactionReceipt({ hash });

      this.logger.info(`Deployment of pool ${poolName} succeeded!`, receipt.status);

      let poolId: number | undefined;
      try {
        // Latest Event is PoolRegistered which includes the poolId
        console.log(receipt.logs);
        const registerEvent = receipt.logs?.pop();
        console.log({ registerEvent });
        poolId =
          registerEvent && registerEvent.args && registerEvent.args[0]
            ? (registerEvent.args[0] as BigNumber).toNumber()
            : undefined;
      } catch (e) {
        this.logger.warn("Unable to retrieve pool ID from receipt events", e);
      }

      const [, existingPools] = await this.publicClient.readContract({
        address: getAddress(this.chainDeployment.FusePoolDirectory.address),
        abi: FusePoolDirectoryABI,
        functionName: "getActivePools",
      });

      // Compute Unitroller address
      const poolAddress = getPoolAddress(
        account,
        poolName,
        existingPools.length,
        this.chainDeployment.FuseFeeDistributor.address,
        this.chainDeployment.FusePoolDirectory.address
      );

      // Accept admin status via Unitroller
      const acceptTx = await this.walletClient.writeContract({
        address: getAddress(poolAddress),
        abi: UnitrollerABI,
        functionName: "_acceptAdmin",
        account,
        chain: this.walletClient.chain,
      });

      const acceptReceipt = await this.publicClient.waitForTransactionReceipt({ hash: acceptTx });
      this.logger.info(`Accepted admin status for admin: ${acceptReceipt.status}`);

      // Whitelist
      this.logger.info(`enforceWhitelist: ${enforceWhitelist}`);
      if (enforceWhitelist) {
        const whitelistTx = await this.walletClient.writeContract({
          address: getAddress(poolAddress),
          abi: ComptrollerABI,
          functionName: "_setWhitelistStatuses",
          args: [whitelist.map((addr) => getAddress(addr)), Array(whitelist.length).fill(true)],
          account,
          chain: this.walletClient.chain,
        });

        // Was enforced by pool deployment, now just add addresses
        const whitelistReceipt = await this.publicClient.waitForTransactionReceipt({ hash: whitelistTx });
        this.logger.info(`Whitelist updated: ${whitelistReceipt.status}`);
      }

      return [poolAddress, implementationAddress, priceOracle, poolId];
    } catch (error) {
      throw Error(`Deployment of new Fuse pool failed:  ${error instanceof Error ? error.message : error}`);
    }
  }

  async identifyInterestRateModel(interestRateModelAddress: string): Promise<InterestRateModel> {
    // Get interest rate model type from runtime bytecode hash and init class
    const interestRateModels: { [key: string]: any } = {
      JumpRateModel: JumpRateModel,
      WhitePaperInterestRateModel: WhitePaperInterestRateModel,
      AnkrBNBInterestRateModel: AnkrBNBInterestRateModel,
      AnkrFTMInterestRateModel: AnkrFTMInterestRateModel,
      AdjustableJumpRateModel: AdjustableJumpRateModel,
      AdjustableAnkrBNBIrm: AdjustableAnkrBNBIrm,
    };
    const bytecode = await this.publicClient.getBytecode({ address: getAddress(interestRateModelAddress) });

    if (!bytecode) {
      throw Error("Bytecode not found");
    }

    const runtimeBytecodeHash = keccak256(bytecode);

    let irmModel = null;

    for (const irm of Object.values(interestRateModels)) {
      if (runtimeBytecodeHash === irm.RUNTIME_BYTECODE_HASH) {
        irmModel = new irm();
        break;
      }
    }
    if (irmModel === null) {
      throw Error("InterestRateModel not found");
    }
    return irmModel;
  }

  async getInterestRateModel(assetAddress: string): Promise<InterestRateModel> {
    // Get interest rate model address from asset address
    const interestRateModelAddress: string = await this.publicClient.readContract({
      address: getAddress(assetAddress),
      abi: CTokenInterfaceABI,
      functionName: "interestRateModel",
    });

    const interestRateModel = await this.identifyInterestRateModel(interestRateModelAddress);
    if (!interestRateModel) {
      throw Error(`No Interest Rate Model found for asset: ${assetAddress}`);
    }
    await interestRateModel.init(interestRateModelAddress, assetAddress, this.publicClient);
    return interestRateModel;
  }

  getPriceOracle(oracleAddress: string): string {
    let oracle = this.availableOracles.find((o) => this.chainDeployment[o].address === oracleAddress);

    if (!oracle) {
      oracle = "Unrecognized Oracle";
    }

    return oracle;
  }

  getEIP20TokenInstance(address: string, signerOrProvider: SignerOrProvider = this.provider) {
    currentSdk.walletClient.writeContract({
      address: getAddress(asset),
      abi: EIP20InterfaceABI,
      functionName: "approve",
      args: [getAddress(vault), MaxUint256],
      account: this.account,
      chain: this.walletClient.chain,
    });

    return new Contract(address, EIP20InterfaceABI, signerOrProvider) as EIP20Interface;
    const aa = getContract({
      address: getAddress(address),
      abi: EIP20InterfaceABI,
      publicClient: this.publicClient,
      walletClient: this.walletClient,
    });
    aa.write.approve([getAddress("0x22222"), 10n]);
  }

  getUnitrollerInstance(address: string, signerOrProvider: SignerOrProvider = this.provider) {
    return new Contract(address, UnitrollerABI, signerOrProvider) as Unitroller;
  }

  getFusePoolDirectoryInstance(signerOrProvider: SignerOrProvider = this.provider) {
    return new Contract(this.chainDeployment.FusePoolDirectory.address, FusePoolDirectoryABI, signerOrProvider);
  }

  getMidasErc4626PluginInstance(address: string, signerOrProvider: SignerOrProvider = this.provider) {
    return new Contract(address, MidasERC4626ABI, signerOrProvider) as MidasERC4626;
  }
}

const MidasBaseWithModules = withFusePoolLens(
  withFundOperations(
    withSafeLiquidator(
      withFusePools(withAsset(withFlywheel(withVaults(withCreateContracts(withConvertMantissa(MidasBase))))))
    )
  )
);
export class MidasSdk extends MidasBaseWithModules {}
export default MidasSdk;
