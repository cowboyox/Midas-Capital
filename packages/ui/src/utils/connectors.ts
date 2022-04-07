import { Chain } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';

import { NETWORK_DATA } from '@constants/networkData';

const infuraId = process.env.INFURA_ID;

const chains: Chain[] = Object.values(NETWORK_DATA).map((data) => {
  return {
    id: data.chainId,
    name: data.name,
    nativeCurrency: {
      name: data.nativeCurrency.name,
      symbol: data.nativeCurrency.symbol,
      decimals: 18,
    },
    rpcUrls: data.rpcUrls,
    blockExplorers: data.blockExplorerUrls,
    testnet: data.testnet,
  };
});

export const connectors = () => {
  return [
    new InjectedConnector({ chains, options: { shimDisconnect: true } }),
    new WalletConnectConnector({
      chains,
      options: {
        infuraId,
        qrcode: true,
      },
    }),
  ];
};