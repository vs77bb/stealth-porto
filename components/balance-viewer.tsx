"use client";

import { useAccount, useReadContract, useBlockNumber } from "wagmi";
import { useEffect } from "react";
import { stablecoinContracts, erc20Abi } from "@/lib/stablecoin-contracts";
import { format } from "./tip";
import { Wallet, Eye } from 'lucide-react';

export function BalanceViewer() {
  const account = useAccount();
  const { data: blockNumber } = useBlockNumber({
    watch: {
      enabled: true,
      pollingInterval: 1000,
    },
  });

  // Read balances for all stablecoins
  const { data: usdcBalance, refetch: refetchUSDC } = useReadContract({
    abi: erc20Abi,
    address: stablecoinContracts.USDC.address,
    args: [account.address!],
    functionName: "balanceOf",
    query: { 
      enabled: !!account.address,
      refetchInterval: 2000, // Refetch every 2 seconds
    },
  });

  const { data: daiBalance, refetch: refetchDAI } = useReadContract({
    abi: erc20Abi,
    address: stablecoinContracts.DAI.address,
    args: [account.address!],
    functionName: "balanceOf",
    query: { 
      enabled: !!account.address,
      refetchInterval: 2000,
    },
  });

  const { data: usdtBalance, refetch: refetchUSDT } = useReadContract({
    abi: erc20Abi,
    address: stablecoinContracts.USDT.address,
    args: [account.address!],
    functionName: "balanceOf",
    query: { 
      enabled: !!account.address,
      refetchInterval: 2000,
    },
  });

  // Add logging to the balance queries
  useEffect(() => {
    console.log("USDT Balance updated:", usdtBalance?.toString());
  }, [usdtBalance]);

  useEffect(() => {
    console.log("USDC Balance updated:", usdcBalance?.toString());
  }, [usdcBalance]);

  // Refetch balances when block number changes
  useEffect(() => {
    refetchUSDC();
    refetchDAI();
    refetchUSDT();
  }, [blockNumber, refetchUSDC, refetchDAI, refetchUSDT]);

  // Update the refetchAllBalances function with logging
  const refetchAllBalances = () => {
    console.log("Manually refetching all balances...");
    refetchUSDC();
    refetchDAI();
    refetchUSDT();
  };

  // Make this function available to parent components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refetchStablecoinBalances = refetchAllBalances;
    }
  }, []);

  if (!account.address) {
    return (
      <div className="flex w-full max-w-[280px] flex-col items-center gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50">
        <Eye size={32} className="text-gray-400" />
        <p className="text-gray-500 text-sm text-center">
          Sign in to view your balances
        </p>
      </div>
    );
  }

  const balances = [
    {
      symbol: "USDC",
      name: "USD Coin",
      balance: usdcBalance,
      decimals: stablecoinContracts.USDC.decimals,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      symbol: "DAI",
      name: "Dai Stablecoin", 
      balance: daiBalance,
      decimals: stablecoinContracts.DAI.decimals,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      symbol: "USDT",
      name: "Tether USD",
      balance: usdtBalance,
      decimals: stablecoinContracts.USDT.decimals,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  const totalValue = balances.reduce((sum, token) => {
    const tokenValue = Number(format(token.balance ?? 0n, token.decimals));
    return sum + tokenValue;
  }, 0);

  return (
    <div className="flex w-full max-w-[280px] flex-col gap-4 p-4 border border-gray-200 rounded-xl bg-white">
      <div className="flex items-center gap-2">
        <Wallet size={24} className="text-blue-600" />
        <h3 className="font-semibold text-gray-900">Demo Token Balances</h3>
      </div>

      {/* Total Value */}
      <div className="w-full p-3 bg-gray-50 rounded-lg text-center">
        <div className="text-sm text-gray-500 mb-1">Total Value</div>
        <div className="text-2xl font-bold text-gray-900">
          ${totalValue.toFixed(2)}
        </div>
      </div>

      {/* Individual Balances */}
      <div className="space-y-3">
        {balances.map((token) => (
          <div
            key={token.symbol}
            className={`flex items-center justify-between p-3 rounded-lg ${token.bgColor}`}
          >
            <div className="flex flex-col">
              <span className={`font-semibold ${token.color}`}>
                {token.symbol}
              </span>
              <span className="text-xs text-gray-500">
                {token.name}
              </span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-900">
                {format(token.balance ?? 0n, token.decimals)}
              </div>
              <div className="text-xs text-gray-500">
                ≈ ${format(token.balance ?? 0n, token.decimals)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-400 text-center">
        Demo tokens using EXP1 contract
      </div>
    </div>
  );
}
