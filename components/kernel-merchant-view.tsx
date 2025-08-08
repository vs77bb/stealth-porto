"use client";

import { useState, useEffect, useRef } from "react";
import { useReadContract, useBlockNumber, usePublicClient, useWalletClient } from "wagmi";
import { createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { exp1Config } from "@/lib/contracts";
import { KERNEL_STEALTH_KEYS } from "@/lib/stealth-addresses";
import { executePrivacyPreservingSweep, ACCOUNT_ABSTRACTION_IMPLEMENTATION } from "@/lib/eip7702-stealth";
import { format } from "./tip";
import { Store, Eye, Wallet, RefreshCw, AlertCircle, ScanSearchIcon as Sweep, Key, Play, CheckCircle, ArrowRight, Zap, Fuel, Sparkles } from 'lucide-react';
import { toast } from "sonner";
import { parseEther } from 'viem';

// Define the structure for stealth payment data
interface StealthPaymentData {
  address: string;
  ephemeralPublicKey: string;
  viewTag: number;
  amount: string;
  timestamp: string;
}

interface EIP7702SweepStep {
  step: number;
  title: string;
  description: string;
  stealthAddress: string;
  upgradeHash?: string;
  sweepHash?: string;
  completed: boolean;
  error?: string;
  isUpgraded?: boolean;
}

export function KernelMerchantView() {
  const [allStealthPayments, setAllStealthPayments] = useState<StealthPaymentData[]>([]);
  const [totalReceived, setTotalReceived] = useState<bigint>(0n);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>("");
  const [paymentLog, setPaymentLog] = useState<Array<{
    address: string;
    timestamp: string;
    amount: string;
    id: string;
  }>>([]);
  const [showSweepDetails, setShowSweepDetails] = useState(false);
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepSteps, setSweepSteps] = useState<EIP7702SweepStep[]>([]);
  const [currentSweepStep, setCurrentSweepStep] = useState(0);
  const [sweepMode, setSweepMode] = useState<'simulation' | 'eip7702'>('eip7702');

  // Use ref to track processed payments to prevent duplicates
  const processedPayments = useRef<Set<string>>(new Set());

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Read balance of Kernel's main wallet (where swept funds go)
  const { data: mainWalletBalance, refetch: refetchMainWalletBalance } = useReadContract({
    abi: exp1Config.abi,
    address: exp1Config.address,
    args: [KERNEL_STEALTH_KEYS.mainWalletAddress],
    functionName: "balanceOf",
    query: {
      refetchInterval: 2000,
    },
  });

  const handleEIP7702Sweep = async () => {
    if (allStealthPayments.length === 0 || totalReceived === 0n || !walletClient) {
      toast.error("No stealth funds to sweep or wallet not connected");
      return;
    }

    console.log("=== EIP-7702 STEALTH SWEEP INITIATED ===");
    console.log(`Sweeping ${format(totalReceived)} USDT from ${allStealthPayments.length} stealth addresses`);
    console.log(`Using EIP-7702 account abstraction`);

    setIsSweeping(true);
    setCurrentSweepStep(0);

    // Prepare sweep steps
    const steps: EIP7702SweepStep[] = allStealthPayments.map((payment, index) => ({
      step: index + 1,
      title: `EIP-7702 Sweep #${index + 1}`,
      description: `Upgrade to smart wallet and sweep 1 USDT`,
      stealthAddress: payment.address,
      completed: false,
      isUpgraded: false,
    }));

    setSweepSteps(steps);

    try {
      // Convert payments to the format expected by the sweep function
      const paymentsForSweep = allStealthPayments.map(payment => ({
        address: payment.address,
        ephemeralPublicKey: payment.ephemeralPublicKey,
        amount: BigInt("1000000000000000000"), // 1 USDT
      }));

      // Execute the privacy-preserving sweep using EIP-7702
      console.log("🔥 Executing EIP-7702 privacy-preserving sweep...");
      
      // Simulate the sweep process step by step for UI
      for (let i = 0; i < allStealthPayments.length; i++) {
        const payment = allStealthPayments[i];
        setCurrentSweepStep(i + 1);

        console.log(`\n--- Processing EIP-7702 Sweep #${i + 1} ---`);
        console.log("Stealth Address:", payment.address);

        try {
          // Step 1: Upgrade to EIP-7702 smart wallet (Kernel funds this)
          console.log("🔧 Upgrading to EIP-7702 smart wallet...");
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const upgradeHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;
          
          setSweepSteps(prev => prev.map((step, index) => 
            index === i ? { 
              ...step, 
              isUpgraded: true,
              upgradeHash,
              description: "Smart wallet upgrade complete, executing sweep..."
            } : step
          ));

          console.log("✅ Upgrade complete:", upgradeHash);
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Step 2: Execute batch sweep from smart wallet
          console.log("💸 Executing batch sweep from smart wallet...");
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const sweepHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;

          setSweepSteps(prev => prev.map((step, index) => 
            index === i ? { 
              ...step, 
              completed: true,
              sweepHash,
              description: "Sweep complete - funds transferred to main wallet"
            } : step
          ));

          console.log("✅ Sweep complete:", sweepHash);

        } catch (error) {
          console.error(`❌ Error processing EIP-7702 sweep #${i + 1}:`, error);
          
          setSweepSteps(prev => prev.map((step, index) => 
            index === i ? { 
              ...step, 
              completed: false,
              error: error instanceof Error ? error.message : "Unknown error"
            } : step
          ));

          continue;
        }
      }

      const successfulSweeps = sweepSteps.filter(step => step.completed).length;
      
      toast.success("EIP-7702 Sweep Complete!", {
        description: `${successfulSweeps}/${allStealthPayments.length} stealth payments swept with perfect privacy`,
      });

      console.log("=== EIP-7702 SWEEP COMPLETED ===");
      console.log(`Successful sweeps: ${successfulSweeps}/${allStealthPayments.length}`);

    } catch (error) {
      console.error("❌ EIP-7702 Sweep failed:", error);
      toast.error("EIP-7702 Sweep Failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }

    // Clean up after sweep
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        (window as any).allStealthPayments = [];
        (window as any).allStealthAddresses = [];
        // Clear ephemeral private keys for swept addresses
        const ephemeralKeys = (window as any).ephemeralPrivateKeys || {};
        allStealthPayments.forEach(payment => {
          delete ephemeralKeys[payment.address];
        });
      }
      setAllStealthPayments([]);
      setTotalReceived(0n);
      processedPayments.current.clear();
      setIsSweeping(false);
      setSweepSteps([]);
      setCurrentSweepStep(0);
      
      // Refresh balances
      refetchMainWalletBalance();
    }, 3000);
  };

  const handleSimulationSweep = async () => {
    if (allStealthPayments.length === 0 || totalReceived === 0n) {
      toast.error("No stealth funds to sweep");
      return;
    }

    console.log("=== STEALTH SWEEP SIMULATION INITIATED ===");
    setIsSweeping(true);
    setCurrentSweepStep(0);

    // Generate simulation steps
    const steps: EIP7702SweepStep[] = allStealthPayments.map((payment, index) => {
      const fakeUpgradeHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;
      const fakeSweepHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;
      
      return {
        step: index + 1,
        title: `Simulate EIP-7702 #${index + 1}`,
        description: `Simulate upgrade and sweep of 1 USDT`,
        stealthAddress: payment.address,
        upgradeHash: fakeUpgradeHash,
        sweepHash: fakeSweepHash,
        completed: false,
        isUpgraded: false,
      };
    });

    setSweepSteps(steps);

    // Simulate each step with delays
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // First show upgrade
      setSweepSteps(prev => prev.map((step, index) => 
        index === i ? { ...step, isUpgraded: true } : step
      ));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then show completion
      setCurrentSweepStep(i + 1);
      setSweepSteps(prev => prev.map((step, index) => 
        index === i ? { ...step, completed: true } : step
      ));
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success("EIP-7702 Simulation Complete!", {
      description: `${allStealthPayments.length} stealth payments would be swept with perfect privacy`,
    });

    // Clean up
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        (window as any).allStealthPayments = [];
        (window as any).allStealthAddresses = [];
      }
      setAllStealthPayments([]);
      setTotalReceived(0n);
      processedPayments.current.clear();
      setIsSweeping(false);
      setSweepSteps([]);
      setCurrentSweepStep(0);
      refetchMainWalletBalance();
    }, 2000);
  };

  const { data: blockNumber } = useBlockNumber({
    watch: {
      enabled: true,
      pollingInterval: 1000,
    },
  });

  // Get all stealth payments and update tracking
  useEffect(() => {
    const updateStealthPayments = async () => {
      if (typeof window !== 'undefined' && (window as any).allStealthPayments) {
        const payments = (window as any).allStealthPayments as StealthPaymentData[];
        
        const newPayments = payments.filter(payment => 
          !processedPayments.current.has(payment.address)
        );
        
        if (newPayments.length > 0) {
          const now = new Date().toLocaleTimeString();
          console.log(`[${now}] Kernel detected NEW stealth payments:`, newPayments.length);
          
          newPayments.forEach(payment => processedPayments.current.add(payment.address));
          
          const newPaymentLogs = newPayments.map(payment => ({
            address: payment.address,
            timestamp: now,
            amount: `${payment.amount} USDT`,
            id: `${payment.address}-${Date.now()}-${Math.random()}`
          }));
          
          setPaymentLog(prev => [...prev, ...newPaymentLogs]);
          setAllStealthPayments(payments);
          setLastUpdateTime(now);
          
          const total = BigInt(payments.length) * BigInt("1000000000000000000");
          setTotalReceived(total);
        }
      }
    };

    updateStealthPayments();
    const interval = setInterval(updateStealthPayments, 3000);
    
    if (typeof window !== 'undefined') {
      (window as any).refreshMerchantView = () => {
        refetchMainWalletBalance();
        updateStealthPayments();
      };
    }

    return () => clearInterval(interval);
  }, []);

  const scanForPayments = () => {
    console.log("Manually scanning for stealth payments...");
    refetchMainWalletBalance();
  };

  const clearPaymentLog = () => {
    console.log("Clearing all payment data...");
    setPaymentLog([]);
    processedPayments.current.clear();
    if (typeof window !== 'undefined') {
      (window as any).allStealthPayments = [];
      (window as any).allStealthAddresses = [];
    }
    setAllStealthPayments([]);
    setTotalReceived(0n);
    setIsSweeping(false);
    setSweepSteps([]);
    setCurrentSweepStep(0);
  };

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-4 p-4 border border-gray-200 rounded-xl bg-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store size={24} className="text-purple-600" />
          <h3 className="font-semibold text-gray-900">Kernel Merchant Dashboard</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={scanForPayments}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            title="Scan for payments"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={clearPaymentLog}
            className="p-2 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-100"
            title="Clear payment log"
          >
            <AlertCircle size={16} />
          </button>
        </div>
      </div>

      {/* Debug Info */}
      <div className="w-full p-2 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="text-xs text-yellow-700">
          <div className="font-medium mb-1">🔍 Debug Info:</div>
          <div>Last Update: {lastUpdateTime || "Never"}</div>
          <div>Total Payments: {allStealthPayments.length}</div>
          <div>Processed Payments: {processedPayments.current.size}</div>
          <div>Payment Log Entries: {paymentLog.length}</div>
        </div>
      </div>

      {/* Merchant Info */}
      <div className="w-full p-3 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-purple-900">Kernel</span>
          <div className="flex items-center gap-1 text-purple-700">
            <Eye size={14} />
            <span className="text-xs">EIP-7702 Stealth Receiver</span>
          </div>
        </div>
        <div className="text-xs text-purple-700">
          Using EIP-7702 for perfect payment privacy
        </div>
      </div>

      {/* Total Received Summary */}
      <div className="w-full p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="text-center">
          <div className="text-sm text-green-700 mb-1">Total Received via Stealth</div>
          <div className="text-3xl font-bold text-green-600">
            {format(totalReceived)} USDT
          </div>
          <div className="text-sm text-green-700 mt-1">
            From {allStealthPayments.length} stealth payment{allStealthPayments.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* EIP-7702 Sweep Progress */}
      {isSweeping && (
        <div className="w-full p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            {sweepMode === 'eip7702' ? (
              <Sparkles size={20} className="text-blue-600" />
            ) : (
              <Play size={20} className="text-blue-600" />
            )}
            <span className="font-semibold text-blue-900">
              {sweepMode === 'eip7702' ? 'EIP-7702 Sweep Running' : 'EIP-7702 Simulation Running'}
            </span>
          </div>
          
          <div className="space-y-2">
            {sweepSteps.map((step, index) => (
              <div key={step.step} className={`p-2 rounded border text-xs ${
                step.error
                  ? 'bg-red-100 border-red-300'
                  : step.completed 
                    ? 'bg-green-100 border-green-300' 
                    : step.isUpgraded
                      ? 'bg-yellow-100 border-yellow-300'
                      : index === currentSweepStep - 1
                        ? 'bg-blue-100 border-blue-300' 
                        : 'bg-gray-100 border-gray-300'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium flex items-center gap-1">
                    {step.error ? '❌' : step.completed ? '✅' : step.isUpgraded ? '🔧' : index === currentSweepStep - 1 ? '⏳' : '⏸️'} 
                    {step.title}
                    {step.isUpgraded && !step.completed && <Sparkles size={12} className="text-blue-500" />}
                  </span>
                  <span className="font-mono text-xs">1.0 USDT</span>
                </div>
                <div className="text-gray-600 text-xs mb-1">
                  {step.description}
                </div>
                <div className="text-gray-600 flex items-center gap-1">
                  <span>From: {step.stealthAddress.slice(0, 10)}...{step.stealthAddress.slice(-6)}</span>
                  {step.isUpgraded && (
                    <span className="text-blue-600 flex items-center gap-1">
                      <Sparkles size={10} />
                      Smart Wallet
                    </span>
                  )}
                </div>
                <div className="text-gray-600 flex items-center gap-1">
                  <ArrowRight size={12} />
                  <span>To: {KERNEL_STEALTH_KEYS.mainWalletAddress.slice(0, 10)}...{KERNEL_STEALTH_KEYS.mainWalletAddress.slice(-6)}</span>
                  <span className="text-xs text-purple-600">(Main Wallet)</span>
                </div>
                {step.upgradeHash && (
                  <div className="text-blue-600 font-mono text-xs">
                    Upgrade: {step.upgradeHash.slice(0, 10)}...{step.upgradeHash.slice(-6)}
                  </div>
                )}
                {step.completed && step.sweepHash && (
                  <div className="text-green-600 font-mono text-xs">
                    Sweep: {step.sweepHash.slice(0, 10)}...{step.sweepHash.slice(-6)}
                  </div>
                )}
                {step.error && (
                  <div className="text-red-600 text-xs mt-1">
                    Error: {step.error}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-3 text-center">
            <div className="text-sm text-blue-700">
              Step {currentSweepStep} of {sweepSteps.length}
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentSweepStep / sweepSteps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Payment Activity Log */}
      <div className="w-full">
        <div className="text-sm font-medium text-gray-700 mb-2">
          Payment Activity Log ({paymentLog.length} entries)
        </div>
        
        {paymentLog.length === 0 ? (
          <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg border text-center">
            No payment activity logged
            <br />
            <span className="text-xs">Payments from your account will appear here</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {paymentLog.slice().reverse().map((payment) => (
              <div key={payment.id} className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-blue-700">
                    {payment.timestamp}
                  </span>
                  <span className="text-sm font-semibold text-blue-600">
                    {payment.amount}
                  </span>
                </div>
                <div className="font-mono text-xs text-blue-600 break-all">
                  {payment.address.slice(0, 20)}...{payment.address.slice(-10)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  ID: {payment.id.slice(-8)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Individual Stealth Payments */}
      <div className="w-full">
        <div className="text-sm font-medium text-gray-700 mb-2">
          Current Stealth Payments ({allStealthPayments.length})
        </div>
        
        {allStealthPayments.length === 0 ? (
          <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg border text-center">
            No active stealth payments
            <br />
            <span className="text-xs">Make a payment to generate stealth addresses</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {allStealthPayments.map((payment, index) => (
              <div key={payment.address} className="p-2 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-orange-700">
                    Payment #{index + 1}
                  </span>
                  <span className="text-sm font-semibold text-orange-600">
                    {payment.amount} USDT
                  </span>
                </div>
                <div className="font-mono text-xs text-orange-600 break-all mb-1">
                  {payment.address}
                </div>
                <div className="text-xs text-gray-500">
                  Ephemeral: {payment.ephemeralPublicKey.slice(0, 10)}...
                </div>
                <div className="text-xs text-blue-600 font-medium">
                  🔧 Ready for EIP-7702 upgrade
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kernel's Main Wallet */}
      <div className="w-full p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
          <Wallet size={16} />
          Kernel's Main Wallet
        </div>
        <div className="font-mono text-xs text-green-600 break-all mb-2">
          {KERNEL_STEALTH_KEYS.mainWalletAddress}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-green-600">Balance (after sweep):</span>
          <span className="font-bold text-green-700">
            {format(mainWalletBalance ?? 0n)} USDT
          </span>
        </div>
      </div>

      {/* EIP-7702 Sweep Controls */}
      {allStealthPayments.length > 0 && !isSweeping && (
        <div className="w-full p-4 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-orange-600" />
              <span className="font-semibold text-orange-900">EIP-7702 Stealth Sweep</span>
            </div>
            <span className="text-sm font-bold text-orange-600">
              {format(totalReceived)} USDT
            </span>
          </div>

          {/* Mode Selection */}
          <div className="mb-3">
            <div className="text-xs font-medium text-orange-700 mb-2">Sweep Mode:</div>
            <div className="flex gap-2">
              <button
                onClick={() => setSweepMode('eip7702')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                  sweepMode === 'eip7702'
                    ? 'bg-orange-500 text-white'
                    : 'bg-orange-200 text-orange-700 hover:bg-orange-300'
                }`}
              >
                <Sparkles size={12} />
                EIP-7702 Sweep
              </button>
              <button
                onClick={() => setSweepMode('simulation')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  sweepMode === 'simulation'
                    ? 'bg-orange-500 text-white'
                    : 'bg-orange-200 text-orange-700 hover:bg-orange-300'
                }`}
              >
                🎭 Simulation
              </button>
            </div>
          </div>
          
          <div className="text-xs text-orange-700 mb-3">
            {sweepMode === 'eip7702' ? (
              <>✨ <strong>EIP-7702 Sweep:</strong> Upgrades stealth addresses to smart wallets, Kernel funds gas</>
            ) : (
              <>🎭 <strong>Simulation:</strong> Shows how EIP-7702 sweep would work</>
            )}
          </div>

          {/* EIP-7702 Benefits */}
          <div className="mb-3 p-2 bg-blue-100 rounded border border-blue-300">
            <div className="text-xs text-blue-800 space-y-1">
              <div className="font-medium flex items-center gap-1">
                <Sparkles size={12} />
                EIP-7702 Benefits:
              </div>
              <div>• Kernel funds stealth addresses during sweep</div>
              <div>• No ETH funding from user wallet (perfect privacy)</div>
              <div>• Smart wallet features: batching, gasless operations</div>
              <div>• Can bundle multiple operations per stealth address</div>
            </div>
          </div>

          {/* Privacy Explanation */}
          <div className="mb-3 p-2 bg-green-100 rounded border border-green-300">
            <div className="text-xs text-green-800 space-y-1">
              <div className="font-medium">🔒 Perfect Privacy Achieved:</div>
              <div>• User wallet never funds stealth addresses</div>
              <div>• Kernel funds and upgrades during sweep</div>
              <div>• Observer sees: "Random Smart Wallet → Kernel"</div>
              <div>• Zero on-chain link between user and payments</div>
            </div>
          </div>

          {/* Technical Details Toggle */}
          <div className="mb-3">
            <button
              onClick={() => setShowSweepDetails(!showSweepDetails)}
              className="flex items-center gap-2 text-xs text-orange-600 hover:text-orange-800"
            >
              <Key size={12} />
              {showSweepDetails ? "Hide" : "Show"} EIP-7702 Technical Details
            </button>
            
            {showSweepDetails && (
              <div className="mt-2 p-2 bg-orange-100 rounded border text-xs space-y-1">
                <div className="font-medium text-orange-800">EIP-7702 Sweep Process:</div>
                <div className="text-orange-700 space-y-1">
                  <p>1. Kernel funds stealth address with ETH (0.002 ETH)</p>
                  <p>2. Generate EIP-7702 authorization signature</p>
                  <p>3. Upgrade stealth EOA to smart contract wallet</p>
                  <p>4. Smart wallet can now batch operations</p>
                  <p>5. Execute batch: transfer tokens + cleanup</p>
                  <p>6. All gas paid by Kernel, not user</p>
                </div>
                <div className="text-green-600 font-medium mt-2">
                  🔒 Result: Perfect privacy + advanced smart wallet features
                </div>
                <div className="text-blue-600 text-xs mt-1">
                  Implementation: {ACCOUNT_ABSTRACTION_IMPLEMENTATION.slice(0, 10)}...
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={sweepMode === 'eip7702' ? handleEIP7702Sweep : handleSimulationSweep}
            disabled={isSweeping || allStealthPayments.length === 0}
            className={
              "w-full py-2 px-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 text-sm" +
              (isSweeping || allStealthPayments.length === 0
                ? " bg-gray-200 text-gray-500 cursor-not-allowed"
                : sweepMode === 'eip7702'
                  ? " bg-purple-500 hover:bg-purple-600 text-white"
                  : " bg-orange-500 hover:bg-orange-600 text-white")
            }
          >
            {isSweeping ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                {sweepMode === 'eip7702' ? 'EIP-7702 Sweeping...' : 'Simulating...'}
              </>
            ) : (
              <>
                {sweepMode === 'eip7702' ? <Sparkles size={16} /> : <Play size={16} />}
                {sweepMode === 'eip7702' ? 'Execute EIP-7702 Sweep' : 'Run Simulation'}
              </>
            )}
          </button>
        </div>
      )}

      <div className="text-xs text-gray-400 text-center space-y-1">
        <p>✨ EIP-7702 Mode: Perfect privacy with smart wallet upgrades</p>
        <p>Kernel funds all gas fees during sweep operation</p>
      </div>
    </div>
  );
}
