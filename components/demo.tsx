"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { SignInButton } from "./sign-in-button";
import { USDTPurchase } from "./usdt-purchase";
import { KernelMerchantView } from "./kernel-merchant-view";

export function Demo() {
  const account = useAccount();
  const [view, setView] = useState<'customer' | 'merchant'>('customer');

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (!isMounted) return null;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* View Toggle */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setView('customer')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            view === 'customer'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Customer View
        </button>
        <button
          onClick={() => setView('merchant')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            view === 'merchant'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Kernel Merchant
        </button>
      </div>

      {/* Content */}
      {view === 'customer' ? (
        !account.address ? (
          <SignInButton>Sign in to pay Kernel</SignInButton>
        ) : (
          <USDTPurchase />
        )
      ) : (
        <KernelMerchantView />
      )}
    </div>
  );
}
