import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  CreditCard,
  RefreshCw,
  Loader,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface TransactionStatusCardProps {
  type: 'onramp' | 'offramp' | 'payment' | 'swap';
  status: 'pending' | 'confirming' | 'completed' | 'failed';
  amount: string;
  asset: string;
  timestamp: Date;
  txHash?: string;
  chain?: 'stellar' | 'ethereum' | 'polygon' | 'base';
  confirmations?: number;
  errorMessage?: string;
  onRetry?: () => void;
  key?: React.Key;
}

const getTypeIcon = (type: TransactionStatusCardProps['type']) => {
  switch (type) {
    case 'onramp':
      return ArrowDown;
    case 'offramp':
      return ArrowUp;
    case 'payment':
      return CreditCard;
    case 'swap':
      return RefreshCw;
    default:
      return RefreshCw;
  }
};

const getStatusIcon = (status: TransactionStatusCardProps['status']) => {
  switch (status) {
    case 'pending':
      return Loader;
    case 'confirming':
      return Clock;
    case 'completed':
      return CheckCircle;
    case 'failed':
      return XCircle;
    default:
      return Clock;
  }
};

const getStatusColor = (status: TransactionStatusCardProps['status']) => {
  switch (status) {
    case 'pending':
      return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
    case 'confirming':
      return 'text-blue-500 bg-blue-50 dark:bg-blue-950/20';
    case 'completed':
      return 'text-green-500 bg-green-50 dark:bg-green-950/20';
    case 'failed':
      return 'text-red-500 bg-red-50 dark:bg-red-950/20';
    default:
      return 'text-gray-500 bg-gray-50 dark:bg-gray-950/20';
  }
};

const getExplorerUrl = (chain: TransactionStatusCardProps['chain'], txHash: string) => {
  switch (chain) {
    case 'stellar':
      return `https://stellar.expert/explorer/public/tx/${txHash}`;
    case 'ethereum':
      return `https://etherscan.io/tx/${txHash}`;
    case 'polygon':
      return `https://polygonscan.com/tx/${txHash}`;
    case 'base':
      return `https://basescan.org/tx/${txHash}`;
    default:
      return '';
  }
};

export const TransactionStatusCard = ({
  type,
  status,
  amount,
  asset,
  timestamp,
  txHash,
  chain,
  confirmations,
  errorMessage,
  onRetry,
}: TransactionStatusCardProps) => {
  const TypeIcon = getTypeIcon(type);
  const StatusIcon = getStatusIcon(status);
  const statusColor = getStatusColor(status);
  const explorerUrl = txHash && chain ? getExplorerUrl(chain, txHash) : '';

  const capitalizedChain = chain ? chain.charAt(0).toUpperCase() + chain.slice(1) : '';

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <TypeIcon className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground capitalize">{type}</span>
        </div>
        <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", statusColor)}>
          <StatusIcon className={cn("w-3 h-3", status === 'pending' && "animate-spin")} />
          <span className="capitalize">{status}</span>
        </div>
      </div>

      <div className="mb-2">
        <div className="text-lg font-semibold text-foreground">
          {amount} {asset}
        </div>
        <div className="text-sm text-muted-foreground">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </div>
      </div>

      {status === 'confirming' && confirmations !== undefined && (
        <div className="mb-3 text-sm text-muted-foreground">
          Confirmations: {confirmations}/12
        </div>
      )}

      {status === 'failed' && errorMessage && (
        <div className="mb-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center justify-between">
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
            aria-label={`View transaction on ${chain} explorer`}
          >
            <ExternalLink className="w-4 h-4" />
            View on {capitalizedChain} Explorer
          </a>
        )}
        {status === 'failed' && onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-primary hover:underline"
            aria-label="Retry transaction"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};