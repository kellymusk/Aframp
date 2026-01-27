'use client';

import { clear } from 'console';
import Link from 'next/link';

type Action = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type Props = {
  title: string;
  message: string;
  status?: number;
  actions: Action[];
};

export default function ErrorLayout({ title, message, status, actions }: Props) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-5">
        {status && (
          <p className="text-xl text-muted-foreground">{status}</p>
        )}
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">{message}</p>

        <div className="flex justify-center gap-3">
          {actions.map((action, i) =>
            action.href ? (
              <Link
                key={i}
                href={action.href}
                className="px-4 py-2 rounded-md bg-primary text-white"
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={i}
                onClick={action.onClick}
                className="px-4 py-2 rounded-md border"
              >
                {action.label}
              </button>
            )
          )}
        </div>
      </div>
    </main>
  );
}
