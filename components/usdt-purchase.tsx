"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useSendCalls, useBlockNumber } from "wagmi";
import { toast } from "sonner";
import { BaseError } from "wagmi";
import { UserRejectedRequestError } from "ox/Provider";
import { exp1Config } from "@/lib/contracts";
import { generateStealthAddress, KERNEL_STEALTH_KEYS } from "@/lib/stealth-addresses";
import { format } from "./tip";
import { DollarSign, Shield, Eye, EyeOff, RefreshCw, Zap } from 'lucide-react';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { keccak256, getAddress, concat } from 'viem';

// Define the structure for tracking stealth payments
interface StealthPaymentData {
  address: string;
  ephemeralPublicKey: string;
  viewTag: number;
  amount: string;
  timestamp: string;
}

export function USDTPurchase() {
  const account = useAccount();
  const [success, setSuccess] = useState(false);
  const [stealthData, setStealthData] = useState<{
    address: string;
    ephemeralPublicKey: string;
    viewTag: number;
  } | null>(null);
  const [showStealthDetails, setShowStealthDetails] = useState(false);
  const [paymentCount, setPaymentCount] = useState(0);

  const { data: blockNumber } = useBlockNumber({
    watch: {
      enabled: true,
      pollingInterval: 1000,
    },
  });
  
  const { data: balance, refetch: refetchBalance } = useReadContract({
    abi: exp1Config.abi,
    address: exp1Config.address,
    args: [account.address!],
    functionName: "balanceOf",
    query: {
      enabled: !!account.address,
      refetchInterval: 2000,
    },
  });

  // Generate stealth address ONLY when component mounts or after successful payment
  const generateStealthAddressForPayment = () => {
    console.log("=== GENERATING NEW STEALTH ADDRESS ===");
    
    // Generate ephemeral key pair first
    const ephemeralPrivateKey = generatePrivateKey();
    const ephemeralAccount = privateKeyToAccount(ephemeralPrivateKey);
    const ephemeralPublicKey = ephemeralAccount.publicKey;
    
    console.log("Generated Ephemeral Private Key:", ephemeralPrivateKey.slice(0, 10) + "...");
    console.log("Generated Ephemeral Public Key:", ephemeralPublicKey);
    
    // Now generate stealth address using a simplified approach
    // Create shared secret using ephemeral private key and Kernel's viewing public key
    const sharedSecret = keccak256(
      concat([ephemeralPrivateKey, KERNEL_STEALTH_KEYS.viewingPublicKey])
    );
    
    // Generate stealth private key
    const stealthPrivateKey = keccak256(
      concat([KERNEL_STEALTH_KEYS.spendingPublicKey, sharedSecret])
    );
    
    const stealthAccount = privateKeyToAccount(stealthPrivateKey);
    const stealthAddress = getAddress(stealthAccount.address);
    
    // Generate view tag
    const viewTag = parseInt(sharedSecret.slice(2, 4), 16);
    
    const newStealthData = {
      address: stealthAddress,
      ephemeralPublicKey: ephemeralPublicKey,
      viewTag: viewTag,
    };
    
    console.log("Generated stealth address:", newStealthData.address);
    console.log("Ephemeral public key:", newStealthData.ephemeralPublicKey);
    
    // Store the ephemeral private key for later use in sweeping
    if (typeof window !== 'undefined') {
      (window as any).ephemeralPrivateKeys = (window as any).ephemeralPrivateKeys || {};
      (window as any).ephemeralPrivateKeys[stealthAddress] = ephemeralPrivateKey;
      console.log("Stored ephemeral private key for address:", stealthAddress);
    }
    
    setStealthData(newStealthData);
    
    return newStealthData;
  };

  // Generate initial stealth address ONLY on mount
  useEffect(() => {
    if (!stealthData) {
      console.log("Component mounted - generating initial stealth address");
      generateStealthAddressForPayment();
    }
  }, []); // Empty dependency array - only run on mount

  useEffect(() => {
    refetchBalance();
  }, [blockNumber, refetchBalance]);

  const { isPending, sendCalls } = useSendCalls({
    mutation: {
      onSuccess(data) {
        console.log("=== PAYMENT SUCCESS ===");
        console.log("Transaction successful:", data);
        console.log("Used stealth address:", stealthData?.address);
        console.log("Ephemeral public key:", stealthData?.ephemeralPublicKey);
        
        // NOW add the COMPLETE stealth payment data to global tracking
        if (stealthData && typeof window !== 'undefined') {
          const existingPayments = (window as any).allStealthPayments || [];
          
          const newPayment: StealthPaymentData = {
            address: stealthData.address,
            ephemeralPublicKey: stealthData.ephemeralPublicKey,
            viewTag: stealthData.viewTag,
            amount: "1.0",
            timestamp: new Date().toISOString(),
          };
          
          // Check we're not adding a duplicate
          const isDuplicate = existingPayments.some((p: StealthPaymentData) => 
            p.address === newPayment.address
          );
          
          if (!isDuplicate) {
            (window as any).allStealthPayments = [...existingPayments, newPayment];
            console.log("Added complete stealth payment data:", newPayment);
            console.log("Total payments now:", (window as any).allStealthPayments.length);
            
            // Also maintain the old array for backward compatibility
            const existingAddresses = (window as any).allStealthAddresses || [];
            (window as any).allStealthAddresses = [...existingAddresses, stealthData.address];
          } else {
            console.warn("Stealth payment already exists in global tracking!");
          }
        }
        
        setSuccess(true);
        setPaymentCount(prev => prev + 1);
        
        toast.success("Payment Sent to Kernel!", {
          description: `$1 USDT sent to stealth address`,
        });
        
        setTimeout(() => {
          refetchBalance();
          
          // Trigger merchant view refresh
          if (typeof window !== 'undefined' && (window as any).refreshMerchantView) {
            (window as any).refreshMerchantView();
          }
          
          // Generate NEW stealth address for next payment
          console.log("Generating new stealth address for next payment...");
          generateStealthAddressForPayment();
        }, 2000);
      },
      onError(err) {
        console.error("=== PAYMENT FAILED ===");
        console.error("Payment to Kernel failed:", err);
        
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
          toast.error("Payment Failed", {
            description: err?.message ?? "Something went wrong",
          });
      },
    },
  });

  const handlePayment = async () => {
    if (!account.address || !stealthData) {
      console.error("Cannot make payment - missing account or stealth data");
      return;
    }

    console.log("=== PAYMENT INITIATED ===");
    console.log("User address:", account.address);
    console.log("Stealth address for this payment:", stealthData.address);
    console.log("Ephemeral public key:", stealthData.ephemeralPublicKey);
    console.log("Current global payments:", (window as any).allStealthPayments || []);

    const oneUsdAmount = BigInt("1000000000000000000"); // 1 USDT

    // Check if user has enough balance
    const currentBalance = balance ?? 0n;
    if (currentBalance < oneUsdAmount) {
      console.log("User has insufficient balance, minting first");
      sendCalls({
        calls: [
          // Mint 2 USDT to user
          {
            abi: exp1Config.abi,
            to: exp1Config.address,
            args: [account.address, BigInt("2000000000000000000")],
            functionName: "mint",
          },
          // Transfer 1 USDT to Kernel's stealth address (NO ETH funding)
          {
            abi: exp1Config.abi,
            to: exp1Config.address,
            args: [stealthData.address, oneUsdAmount],
            functionName: "transfer",
          },
        ],
      });
    } else {
      console.log("User has sufficient balance, transferring directly");
      sendCalls({
        calls: [
          // Transfer 1 USDT to Kernel's stealth address (NO ETH funding)
          {
            abi: exp1Config.abi,
            to: exp1Config.address,
            args: [stealthData.address, oneUsdAmount],
            functionName: "transfer",
          },
        ],
      });
    }
  };

  if (!account.address) {
    return (
      <div className="flex w-full max-w-[320px] flex-col items-center gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50">
        <DollarSign size={32} className="text-gray-400" />
        <p className="text-gray-500 text-sm text-center">
          Sign in to pay Kernel with USDT
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[320px] flex-col items-center gap-4 p-4 border border-gray-200 rounded-xl bg-white">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Shield size={24} className="text-purple-600" />
          <h3 className="font-semibold text-gray-900">Pay Kernel</h3>
        </div>
        {paymentCount > 0 && (
          <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
            Payment #{paymentCount + 1}
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="w-full p-2 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="text-xs text-yellow-700">
          <div className="font-medium mb-1">🔍 Payment Debug:</div>
          <div className="font-mono break-all mb-1">
            Address: {stealthData?.address || "Generating..."}
          </div>
          <div>
            Global Count: {typeof window !== 'undefined' ? ((window as any).allStealthPayments || []).length : 0}
          </div>
        </div>
      </div>

      {/* Merchant Info */}
      <div className="w-full p-3 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-purple-900">Kernel</span>
          <div className="flex items-center gap-1 text-purple-700">
            <Shield size={14} />
            <span className="text-xs">Stealth Payment</span>
          </div>
        </div>
        <div className="text-xs text-purple-700">
          Privacy-enhanced merchant payment
        </div>
      </div>

      {/* EIP-7702 Privacy Notice */}
      <div className="w-full p-2 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-xs text-blue-700">
          <div className="font-medium mb-1 flex items-center gap-1">
            <Zap size={12} />
            EIP-7702 Privacy:
          </div>
          <div>• No ETH funding from your wallet</div>
          <div>• Kernel funds stealth addresses during sweep</div>
          <div>• Perfect payment privacy preserved</div>
        </div>
      </div>

      {/* Stealth Address Details */}
      <div className="w-full">
        <button
          onClick={() => setShowStealthDetails(!showStealthDetails)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-2"
        >
          {showStealthDetails ? <EyeOff size={16} /> : <Eye size={16} />}
          {showStealthDetails ? "Hide" : "Show"} Stealth Address Details
        </button>
        
        {showStealthDetails && stealthData && (
          <div className="p-3 bg-gray-50 rounded-lg border text-xs space-y-2">
            <div>
              <div className="font-medium text-gray-700 mb-1">Stealth Address:</div>
              <div className="font-mono text-gray-600 break-all">
                {stealthData.address}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">Ephemeral Public Key:</div>
              <div className="font-mono text-gray-600 break-all text-xs">
                {stealthData.ephemeralPublicKey}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">View Tag:</div>
              <div className="font-mono text-gray-600">
                {stealthData.viewTag}
              </div>
            </div>
            <div className="text-blue-600 font-medium">
              🔒 Will be upgraded to EIP-7702 smart wallet during sweep
            </div>
          </div>
        )}
      </div>

      {/* Current Balance */}
      <div className="w-full flex justify-between items-center text-sm">
        <span className="text-gray-500">Your USDT Balance:</span>
        <span className="font-medium text-green-600">
          {format(balance ?? 0n)} USDT
        </span>
      </div>

      {/* Payment Amount */}
      <div className="w-full p-4 bg-green-50 rounded-lg text-center border border-green-200">
        <div className="text-3xl font-bold text-green-600 mb-1">$1.00</div>
        <div className="text-sm text-green-700">
          Payment to Kernel
        </div>
        <div className="text-xs text-green-600 mt-1">
          No ETH funding required
        </div>
      </div>

      {/* Payment Button */}
      <button
        onClick={handlePayment}
        disabled={isPending || !stealthData}
        className={
          "w-full py-3 px-4 rounded-xl font-medium transition-colors duration-200 flex items-center justify-center gap-2" +
          (isPending || !stealthData
            ? " bg-gray-200 text-gray-500 cursor-not-allowed"
            : " bg-purple-500 hover:bg-purple-600 text-white")
        }
      >
        {isPending ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
            Processing...
          </>
        ) : (
          <>
            <Shield size={16} />
            {success ? "Pay Again" : "Pay $1 to Kernel"}
          </>
        )}
      </button>

      <div className="text-xs text-gray-400 text-center space-y-1">
        <p>Demo using EIP-7702 stealth addresses</p>
        <p>Each payment uses a unique stealth address</p>
        <p>Kernel funds gas during sweep for perfect privacy</p>
      </div>
    </div>
  );
}
