import React, { createContext, useEffect, useState } from 'react';
import { connectFreighter } from '@/lib/wallets/stellar';

export const WalletContext = createContext<any>(null);

export function WalletProvider({ children }) {
  const [state, setState] = useState({
    status: 'disconnected',
    address: null,
    chain: 'stellar',
    error: null,
  });

  const connect = async () => {
    try {
      setState({ ...state, status: 'connecting' });
      const address = await connectFreighter();

      setState({
        status: 'connected',
        address,
        chain: 'stellar',
        error: null,
      });

      localStorage.setItem('wallet', JSON.stringify({ address }));
    } catch (err: any) {
      setState({
        status: 'error',
        address: null,
        chain: 'stellar',
        error: err.message,
      });
    }
  };

  const disconnect = () => {
    setState({ status: 'disconnected', address: null });
    localStorage.removeItem('wallet');
  };

  useEffect(() => {
    const saved = localStorage.getItem('wallet');
    if (saved) {
      const { address } = JSON.parse(saved);
      setState({
        status: 'connected',
        address,
        chain: 'stellar',
      });
    }
  }, []);

  return (
    <WalletContext.Provider value={{ state, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}
