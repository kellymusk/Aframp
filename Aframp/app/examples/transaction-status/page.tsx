'use client';

import React from 'react';
import { TransactionStatusCard } from '@/components/TransactionStatusCard';

const examples = [
  {
    type: 'swap' as const,
    status: 'confirming' as const,
    amount: '1,500',
    asset: 'cNGN → 2.5 USDC',
    timestamp: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
    txHash: 'example-tx-hash',
    chain: 'stellar' as const,
    confirmations: 8,
  },
  {
    type: 'onramp' as const,
    status: 'pending' as const,
    amount: '500',
    asset: 'USDC',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    type: 'offramp' as const,
    status: 'completed' as const,
    amount: '1,000',
    asset: 'cNGN',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    txHash: 'completed-tx-hash',
    chain: 'ethereum' as const,
  },
  {
    type: 'payment' as const,
    status: 'failed' as const,
    amount: '250',
    asset: 'USDC',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    errorMessage: 'Insufficient funds',
    onRetry: () => alert('Retry clicked'),
  },
  {
    type: 'swap' as const,
    status: 'confirming' as const,
    amount: '0.5',
    asset: 'ETH → 1,800 USDC',
    timestamp: new Date(Date.now() - 1 * 60 * 1000),
    txHash: 'polygon-tx-hash',
    chain: 'polygon' as const,
    confirmations: 5,
  },
  {
    type: 'onramp' as const,
    status: 'completed' as const,
    amount: '2,000',
    asset: 'cNGN',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    txHash: 'base-tx-hash',
    chain: 'base' as const,
  },
];

export default function TransactionStatusExamples() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Transaction Status Card Examples
        </h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {examples.map((example, index) => (
            <TransactionStatusCard key={index} {...example} />
          ))}
        </div>
      </div>
    </div>
  );
}