import type { SdkBase as ConnextSdk, SdkConfig as ConnextSdkConfig } from '@connext/sdk';
import { create as createConnextSdk } from '@connext/sdk';
import { JsonRpcProvider } from '@ethersproject/providers';
import { chainIdToConfig } from '@midas-capital/chains';
import { MidasSdk } from '@midas-capital/sdk';
import Security from '@midas-capital/security';
import type { SupportedChains } from '@midas-capital/types';
import * as Sentry from '@sentry/browser';
import type { FetchSignerResult, Signer } from '@wagmi/core';
import type { Dispatch, ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Chain } from 'wagmi';
import { useAccount, useDisconnect, useNetwork, useSigner } from 'wagmi';
import {
  MIDAS_LOCALSTORAGE_KEYS,
  SUPPORTED_CHAINS_BY_CONNEXT,
  SUPPORTED_CHAINS_XMINT,
} from '@ui/constants/index';
import { useEnabledChains } from '@ui/hooks/useChainConfig';

export interface MultiMidasContextData {
  address?: string;
  chainIds: SupportedChains[];
  connextSdk?: ConnextSdk;
  connextSdkConfig?: ConnextSdkConfig;
  currentChain?: Chain & {
    unsupported?: boolean | undefined;
  };
  currentSdk?: MidasSdk;
  disconnect: () => void;
  enabledChainsForConnext: SupportedChains[];
  getAvailableFromChains: (chainId: number) => SupportedChains[];
  getSdk: (chainId: number) => MidasSdk | undefined;
  getSecurity: (chainId: number) => Security | undefined;
  isConnected: boolean;
  isGlobalLoading: boolean;
  isSidebarCollapsed: boolean | undefined;
  sdks: MidasSdk[];
  securities: Security[];
  setAddress: Dispatch<string>;
  setGlobalLoading: Dispatch<boolean>;
  setIsSidebarCollapsed: Dispatch<boolean>;
  signer?: FetchSignerResult<Signer>;
}

export const MultiMidasContext = createContext<MultiMidasContextData | undefined>(undefined);

interface MultiMidasProviderProps {
  children: ReactNode;
}

export const MultiMidasProvider = ({ children }: MultiMidasProviderProps = { children: null }) => {
  const enabledChains = useEnabledChains();
  const { chain } = useNetwork();
  // const { chain, chains } = useNetwork();
  const { address: wagmiAddress, isConnected } = useAccount();
  // const { address, isConnecting, isReconnecting, isConnected } = useAccount();
  // const { isLoading: isNetworkLoading, isIdle, switchNetworkAsync } = useSwitchNetwork();
  const { data: signer } = useSigner();
  const { disconnect } = useDisconnect();
  const [address, setAddress] = useState<string | undefined>();
  const [currentChain, setCurrentChain] = useState<
    | (Chain & {
        unsupported?: boolean | undefined;
      })
    | undefined
  >();
  const [isGlobalLoading, setGlobalLoading] = useState<boolean>(false);
  const [connextSdk, setConnextSdk] = useState<ConnextSdk>();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>();

  const [sdks, securities, chainIds] = useMemo(() => {
    const _sdks: MidasSdk[] = [];
    const _securities: Security[] = [];
    const _chainIds: SupportedChains[] = [];
    enabledChains.map((chainId) => {
      const config = chainIdToConfig[chainId];
      _sdks.push(
        new MidasSdk(
          new JsonRpcProvider(config.specificParams.metadata.rpcUrls.default.http[0]),
          config
        )
      );
      _securities.push(
        new Security(
          chainId,
          new JsonRpcProvider(config.specificParams.metadata.rpcUrls.default.http[0])
        )
      );
      _chainIds.push(chainId);
    });

    return [_sdks, _securities, _chainIds.sort()];
  }, [enabledChains]);

  const currentSdk = useMemo(() => {
    if (chain && !chain.unsupported) {
      return sdks.find((sdk) => sdk.chainId === chain.id);
    }
  }, [sdks, chain]);

  const getSdk = useCallback(
    (chainId: number) => {
      return sdks.find((sdk) => sdk.chainId === chainId);
    },
    [sdks]
  );

  const enabledChainsForConnext = enabledChains.filter((chainId: number) =>
    Object.keys(SUPPORTED_CHAINS_BY_CONNEXT).includes(chainId.toString())
  );
  const connextSdkConfig = useMemo(() => {
    if (chain && !chain.unsupported) {
      const network = SUPPORTED_CHAINS_BY_CONNEXT[chain.id]?.network;
      if (network && enabledChains.includes(chain.id)) {
        const domainConfig: { [domainId: string]: { providers: string[] } } = {};
        const chainConfig = chainIdToConfig[chain.id];
        for (const enabledChainId of enabledChainsForConnext) {
          const domainId = SUPPORTED_CHAINS_BY_CONNEXT[enabledChainId].domainId;

          domainConfig[domainId] = {
            providers: chainConfig.specificParams.metadata.rpcUrls.default.http,
          };
        }

        const connextSdkConfig: ConnextSdkConfig = {
          chains: domainConfig,
          network: network as 'mainnet' | 'testnet',
          signerAddress: wagmiAddress,
        };
        return connextSdkConfig;
      }
    }
  }, [chain, enabledChains, wagmiAddress, enabledChainsForConnext]);

  useEffect(() => {
    if (connextSdkConfig) {
      createConnextSdk(connextSdkConfig)
        .then((sdkInstance) => setConnextSdk(sdkInstance.sdkBase))
        .catch((e) => {
          console.error('Creating a connext sdk failed!, error: ', e);
        });
    }
  }, [connextSdkConfig]);

  const getAvailableFromChains = useCallback(
    (chainId: number) => {
      const xMintChain = SUPPORTED_CHAINS_XMINT[chainId];
      if (!xMintChain || !xMintChain.supported || !xMintChain.targetAddress) {
        return [];
      }

      return enabledChainsForConnext.filter(
        (c) => c != chainId && SUPPORTED_CHAINS_XMINT[c].swapAddress
      );
    },
    [enabledChainsForConnext]
  );

  const getSecurity = useCallback(
    (chainId: number) => securities.find((security) => security.chainConfig.chainId === chainId),
    [securities]
  );

  useEffect(() => {
    if (currentSdk && signer) {
      currentSdk.setSigner(signer);
    }
  }, [signer, currentSdk]);

  useEffect(() => {
    if (sdks.length > 0 && !signer) {
      sdks.map((sdk) => {
        const config = chainIdToConfig[sdk.chainId];
        sdk.removeSigner(
          new JsonRpcProvider(config.specificParams.metadata.rpcUrls.default.http[0])
        );
      });
    }
  }, [signer, sdks]);

  useEffect(() => {
    if (wagmiAddress) {
      Sentry.setUser({ id: wagmiAddress });
    }

    setAddress(wagmiAddress);
  }, [wagmiAddress]);

  useEffect(() => {
    setCurrentChain(chain);
  }, [chain]);

  useEffect(() => {
    const oldData = localStorage.getItem(MIDAS_LOCALSTORAGE_KEYS);
    if (oldData && JSON.parse(oldData).isSidebarCollapsed) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, []);

  useEffect(() => {
    if (isSidebarCollapsed !== undefined) {
      const oldData = localStorage.getItem(MIDAS_LOCALSTORAGE_KEYS);
      let oldObj;
      if (oldData) {
        oldObj = JSON.parse(oldData);
      }
      const data = { ...oldObj, isSidebarCollapsed };
      localStorage.setItem(MIDAS_LOCALSTORAGE_KEYS, JSON.stringify(data));
    }
  }, [isSidebarCollapsed]);

  const value = useMemo(() => {
    return {
      address,
      chainIds,
      connextSdk,
      connextSdkConfig,
      currentChain,
      currentSdk,
      disconnect,
      enabledChainsForConnext,
      getAvailableFromChains,
      getSdk,
      getSecurity,
      isConnected,
      isGlobalLoading,
      isSidebarCollapsed,
      sdks,
      securities,
      setAddress,
      setGlobalLoading,
      setIsSidebarCollapsed,
      signer,
    };
  }, [
    sdks,
    securities,
    getSecurity,
    chainIds,
    isGlobalLoading,
    setGlobalLoading,
    currentChain,
    currentSdk,
    getSdk,
    address,
    disconnect,
    isConnected,
    signer,
    setAddress,
    connextSdk,
    connextSdkConfig,
    enabledChainsForConnext,
    getAvailableFromChains,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
  ]);

  return <MultiMidasContext.Provider value={value}>{children}</MultiMidasContext.Provider>;
};

// Hook
export function useMultiMidas() {
  const context = useContext(MultiMidasContext);

  if (context === undefined) {
    throw new Error(`useMultiMidas must be used within a MultiMidasProvider`);
  }

  return context;
}
