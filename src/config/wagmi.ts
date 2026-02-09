import { createConfig, http, fallback } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo';

const rpcUrl = import.meta.env.VITE_ETHEREUM_RPC_URL;

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    injected(),
    walletConnect({
      projectId,
      showQrModal: true,
    }),
  ],
  transports: {
    [mainnet.id]: fallback([
      ...(rpcUrl ? [http(rpcUrl)] : []),
      http('https://eth.llamarpc.com'),
      http('https://rpc.ankr.com/eth'),
      http('https://ethereum.publicnode.com'),
    ]),
  },
});
