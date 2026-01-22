import { useWallet } from '@/hooks/useWallet';
import { truncateAddress } from '@/utils/truncateAddress';

export default function ConnectWalletButton() {
  const { state, connect, disconnect } = useWallet();

  if (state.status === 'connecting') {
    return <button>Connecting to wallet...</button>;
  }

  if (state.status === 'connected') {
    return (
      <button onClick={disconnect}>
        {truncateAddress(state.address)} · Stellar
      </button>
    );
  }

  if (state.status === 'error') {
    return <button onClick={connect}>{state.error}</button>;
  }

  return <button onClick={connect}>Connect Wallet</button>;
}
