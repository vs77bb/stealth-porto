"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useSendCalls, useBlockNumber } from "wagmi";
import { Value } from "ox";
import { toast } from "sonner";
import { BaseError } from "wagmi";
import { UserRejectedRequestError } from "ox/Provider";
import { stablecoinContracts, erc20Abi, type StablecoinType } from "@/lib/stablecoin-contracts";
import { format } from "./tip";
import { DollarSign, Coins } from 'lucide-react';

export function StablecoinPurchase() {
  const account = useAccount();
  const [selectedStablecoin, setSelectedStablecoin] = useState<StablecoinType>("USDC");
  const [success, setSuccess] = useState(false);

  const { data: blockNumber } = useBlockNumber({
    watch: {
      enabled: true,
      pollingInterval: 1000,
    },
  });

  const selectedContract = stablecoinContracts[selectedStablecoin];
  
  const { data: balance, refetch: refetchBalance } = useReadContract({
    abi: erc20Abi,
    address: selectedContract.address,
    args: [account.address!],
    functionName: "balanceOf",
    query: {
      enabled: !!account.address,
    },
  });

  useEffect(() => {
    refetchBalance();
  }, [blockNumber, refetchBalance]);

  const { isPending, sendCalls } = useSendCalls({
    mutation: {
      onSuccess(data) {
        console.log("Transaction successful:", data);
        setSuccess(true);
        toast.success("Purchase Successful!", {
          description: `You've received $1 worth of ${selectedStablecoin}`,
        });
        
        // Force balance refresh after successful purchase
        setTimeout(() => {
          console.log("Triggering balance refresh...");
          if (typeof window !== 'undefined' && (window as any).refetchStablecoinBalances) {
            (window as any).refetchStablecoinBalances();
          }
          refetchBalance(); // Also refetch the local balance
        }, 2000); // Wait 2 seconds for transaction to be mined
      },
      onError(err) {
        console.error("Transaction failed:", err);
        const error = (() => {
          if (err instanceof BaseError)
            return err instanceof BaseError
              ? err.walk((err) => err instanceof UserRejectedRequestError)
              : err;
          return err;
        })();

        if (
          (error as any)?.code !== UserRejectedRequestError.code
        )
          toast.error("Purchase Failed", {
            description: `${err?.message ?? "Something went wrong"} - Check console for details`,
          });
      },
    },
  });

  const handlePurchase = async () => {
    if (!account.address) return;

    console.log("Attempting to purchase", selectedStablecoin);
    console.log("Contract address:", selectedContract.address);
    console.log("User address:", account.address);

    // Since we're using EXP1 contract (18 decimals) for all demo tokens
    const oneUsdAmount = BigInt("1000000000000000000"); // 1 * 10^18

    console.log("Amount to mint:", oneUsdAmount.toString());

    sendCalls({
      calls: [
        {
          abi: erc20Abi,
          to: selectedContract.address,
          args: [account.address, oneUsdAmount],
          functionName: "mint",
        },
      ],
    });
  };

  if (!account.address) {
    return (
      <div className="flex w-full max-w-[280px] flex-col items-center gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50">
        <DollarSign size={32} className="text-gray-400" />
        <p className="text-gray-500 text-sm text-center">
          Sign in to purchase stablecoins
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[280px] flex-col items-center gap-4 p-4 border border-gray-200 rounded-xl bg-white">
      <div className="flex items-center gap-2">
        <Coins size={24} className="text-green-600" />
        <h3 className="font-semibold text-gray-900">Buy Stablecoin</h3>
      </div>

      {/* Stablecoin Selection */}
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Choose Stablecoin
        </label>
        <select
          value={selectedStablecoin}
          onChange={(e) => setSelectedStablecoin(e.target.value as StablecoinType)}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isPending}
        >
          {Object.entries(stablecoinContracts).map(([key, contract]) => (
            <option key={key} value={key}>
              {contract.symbol} - {contract.name}
            </option>
          ))}
        </select>
      </div>

      {/* Current Balance */}
      <div className="w-full flex justify-between items-center text-sm">
        <span className="text-gray-500">Current Balance:</span>
        <span className="font-medium">
          {format(balance ?? 0n, selectedContract.decimals)} {selectedContract.symbol}
        </span>
      </div>

      {/* Purchase Amount */}
      <div className="w-full p-3 bg-gray-50 rounded-lg text-center">
        <div className="text-2xl font-bold text-green-600">$1.00</div>
        <div className="text-sm text-gray-500">
          ≈ 1 {selectedContract.symbol}
        </div>
      </div>

      {/* Purchase Button */}
      <button
        onClick={handlePurchase}
        disabled={isPending || selectedStablecoin === "DAI"}
        className={
          "w-full py-3 px-4 rounded-xl font-medium transition-colors duration-200 flex items-center justify-center gap-2" +
          (isPending
            ? " bg-gray-200 text-gray-500 cursor-not-allowed"
            : selectedStablecoin === "DAI"
            ? " bg-yellow-100 text-yellow-700 cursor-not-allowed border border-yellow-300"
            : " bg-green-500 hover:bg-green-600 text-white")
        }
      >
        {isPending ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
            Processing...
          </>
        ) : selectedStablecoin === "DAI" ? (
          <>
            ⚠️ DAI not available on testnet
          </>
        ) : (
          <>
            <DollarSign size={16} />
            {success ? "Buy Again" : `Buy $1 ${selectedContract.symbol}`}
          </>
        )}
      </button>

      <p className="text-xs text-gray-400 text-center">
        This mints testnet tokens for demonstration purposes
      </p>
    </div>
  );
}
