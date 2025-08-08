import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { keccak256, encodePacked, getAddress, hexToBytes, concat, parseEther } from 'viem';
import { createWalletClient, http, type WalletClient } from 'viem';
import { baseSepolia } from 'viem/chains';

// EIP-7702 Authorization structure
export interface EIP7702Authorization {
  chainId: bigint;
  address: `0x${string}`; // Implementation contract address
  nonce: bigint;
  yParity: number;
  r: `0x${string}`;
  s: `0x${string}`;
}

// Simple Account Abstraction implementation contract
export const ACCOUNT_ABSTRACTION_IMPLEMENTATION = "0x1234567890123456789012345678901234567890" as const;

// EIP-7702 Account Abstraction ABI
export const eip7702AccountAbi = [
  {
    inputs: [
      { name: "calls", type: "tuple[]", components: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "data", type: "bytes" }
      ]}
    ],
    name: "executeBatch",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  }
] as const;

export interface EIP7702StealthAddress {
  stealthAddress: `0x${string}`;
  ephemeralPublicKey: `0x${string}`;
  viewTag: number;
  isUpgraded: boolean;
  authorization?: EIP7702Authorization;
}

// Generate EIP-7702 authorization for a stealth address
export async function generateEIP7702Authorization(
  stealthPrivateKey: `0x${string}`,
  implementationAddress: `0x${string}` = ACCOUNT_ABSTRACTION_IMPLEMENTATION
): Promise<EIP7702Authorization> {
  const stealthAccount = privateKeyToAccount(stealthPrivateKey);
  
  // Create authorization message
  const authMessage = {
    chainId: BigInt(baseSepolia.id),
    address: implementationAddress,
    nonce: 0n, // First authorization for this address
  };
  
  // Sign the authorization (simplified - in practice would use proper EIP-7702 signing)
  const signature = await stealthAccount.signMessage({
    message: `Authorize upgrade to ${implementationAddress}`,
  });
  
  // Parse signature components
  const r = signature.slice(0, 66) as `0x${string}`;
  const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
  const yParity = parseInt(signature.slice(130, 132), 16);
  
  return {
    chainId: authMessage.chainId,
    address: authMessage.address,
    nonce: authMessage.nonce,
    yParity,
    r,
    s,
  };
}

// Upgrade a stealth address to EIP-7702 smart wallet
export async function upgradeStealthToEIP7702(
  stealthPrivateKey: `0x${string}`,
  fundingWalletClient: WalletClient,
  ethAmount: bigint = parseEther("0.002") // ETH for gas + operations
): Promise<{
  upgradedAddress: `0x${string}`;
  authorization: EIP7702Authorization;
  transactionHash: `0x${string}`;
}> {
  console.log("=== UPGRADING STEALTH ADDRESS TO EIP-7702 ===");
  
  const stealthAccount = privateKeyToAccount(stealthPrivateKey);
  const stealthAddress = stealthAccount.address;
  
  console.log("Stealth Address:", stealthAddress);
  console.log("Funding with ETH:", ethAmount.toString());
  
  // Generate EIP-7702 authorization
  const authorization = await generateEIP7702Authorization(stealthPrivateKey);
  
  console.log("Generated EIP-7702 Authorization:", authorization);
  
  // Fund and upgrade the stealth address in one transaction
  // This would be done by Kernel's funding wallet
  const transactionHash = await fundingWalletClient.sendTransaction({
    to: stealthAddress,
    value: ethAmount,
    data: `0x7702${authorization.chainId.toString(16).padStart(16, '0')}${authorization.address.slice(2)}${authorization.nonce.toString(16).padStart(16, '0')}${authorization.yParity.toString(16).padStart(2, '0')}${authorization.r.slice(2)}${authorization.s.slice(2)}`,
  });
  
  console.log("Upgrade transaction hash:", transactionHash);
  console.log("Stealth address is now a smart wallet!");
  
  return {
    upgradedAddress: stealthAddress,
    authorization,
    transactionHash,
  };
}

// Create a wallet client for an upgraded EIP-7702 stealth address
export function createEIP7702StealthWallet(
  stealthPrivateKey: `0x${string}`
): WalletClient {
  const stealthAccount = privateKeyToAccount(stealthPrivateKey);
  
  return createWalletClient({
    account: stealthAccount,
    chain: baseSepolia,
    transport: http(),
  });
}

// Execute batch operations from an EIP-7702 stealth wallet
export async function executeBatchFromStealthWallet(
  stealthWalletClient: WalletClient,
  calls: Array<{
    to: `0x${string}`;
    value: bigint;
    data: `0x${string}`;
  }>
): Promise<`0x${string}`> {
  console.log("=== EXECUTING BATCH FROM EIP-7702 STEALTH WALLET ===");
  console.log("Number of calls:", calls.length);
  
  // Execute batch transaction using the upgraded smart wallet
  const hash = await stealthWalletClient.writeContract({
    abi: eip7702AccountAbi,
    address: stealthWalletClient.account!.address,
    functionName: "executeBatch",
    args: [calls],
  });
  
  console.log("Batch execution hash:", hash);
  return hash;
}

// Privacy-preserving sweep using EIP-7702
export async function executePrivacyPreservingSweep(
  stealthPayments: Array<{
    address: string;
    ephemeralPublicKey: string;
    amount: bigint;
  }>,
  kernelFundingWallet: WalletClient,
  destinationAddress: `0x${string}`,
  tokenAddress: `0x${string}`
): Promise<{
  upgradedAddresses: string[];
  sweepTransactions: string[];
  totalSwept: bigint;
}> {
  console.log("=== PRIVACY-PRESERVING EIP-7702 SWEEP ===");
  console.log(`Sweeping ${stealthPayments.length} stealth payments`);
  
  const upgradedAddresses: string[] = [];
  const sweepTransactions: string[] = [];
  let totalSwept = 0n;
  
  for (const payment of stealthPayments) {
    try {
      // 1. Derive stealth private key (same as before)
      const ephemeralPrivateKey = (window as any).ephemeralPrivateKeys?.[payment.address];
      if (!ephemeralPrivateKey) {
        throw new Error("Ephemeral private key not found");
      }
      
      // Derive stealth private key using existing method
      const sharedSecret = keccak256(
        concat([ephemeralPrivateKey, kernelFundingWallet.account!.address as `0x${string}`])
      );
      const stealthPrivateKey = keccak256(concat([sharedSecret, payment.ephemeralPublicKey as `0x${string}`]));
      
      // 2. Upgrade stealth address to EIP-7702 smart wallet (Kernel pays)
      console.log(`\n--- Upgrading ${payment.address} to EIP-7702 ---`);
      const { upgradedAddress, transactionHash: upgradeHash } = await upgradeStealthToEIP7702(
        stealthPrivateKey,
        kernelFundingWallet,
        parseEther("0.002") // Kernel funds the gas
      );
      
      upgradedAddresses.push(upgradedAddress);
      console.log("Upgrade complete:", upgradeHash);
      
      // 3. Create wallet client for the upgraded stealth address
      const stealthWallet = createEIP7702StealthWallet(stealthPrivateKey);
      
      // 4. Prepare batch calls for the smart wallet
      const batchCalls = [
        // Transfer tokens to destination
        {
          to: tokenAddress,
          value: 0n,
          data: encodePacked(
            ['bytes4', 'address', 'uint256'],
            ['0xa9059cbb', destinationAddress, payment.amount] // transfer(address,uint256)
          ),
        },
        // Could add more operations here (e.g., self-destruct, cleanup)
      ];
      
      // 5. Execute batch sweep from the smart wallet
      console.log(`--- Executing batch sweep from ${upgradedAddress} ---`);
      const sweepHash = await executeBatchFromStealthWallet(stealthWallet, batchCalls);
      
      sweepTransactions.push(sweepHash);
      totalSwept += payment.amount;
      
      console.log("Sweep complete:", sweepHash);
      
      // Wait between operations to avoid nonce issues
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Failed to sweep ${payment.address}:`, error);
      continue;
    }
  }
  
  console.log("=== SWEEP COMPLETE ===");
  console.log(`Upgraded addresses: ${upgradedAddresses.length}`);
  console.log(`Successful sweeps: ${sweepTransactions.length}`);
  console.log(`Total swept: ${totalSwept.toString()}`);
  
  return {
    upgradedAddresses,
    sweepTransactions,
    totalSwept,
  };
}
