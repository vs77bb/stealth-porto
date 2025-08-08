import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { keccak256, encodePacked, getAddress, toHex, hexToBytes, concat } from 'viem';

export interface StealthKeyPair {
  spendingPrivateKey: `0x${string}`;
  viewingPrivateKey: `0x${string}`;
  spendingPublicKey: `0x${string}`;
  viewingPublicKey: `0x${string}`;
  stealthMetaAddress: `0x${string}`;
  mainWalletAddress: `0x${string}`; // Add main wallet address
}

export interface StealthAddress {
  stealthAddress: `0x${string}`;
  ephemeralPublicKey: `0x${string}`;
  viewTag: number;
}

// Generate proper stealth keys for a recipient (like Kernel)
export function generateStealthKeys(): StealthKeyPair {
  const spendingPrivateKey = generatePrivateKey();
  const viewingPrivateKey = generatePrivateKey();
  
  const spendingAccount = privateKeyToAccount(spendingPrivateKey);
  const viewingAccount = privateKeyToAccount(viewingPrivateKey);
  
  // Create stealth meta-address by hashing the concatenated public keys
  const spendingPubKeyHash = keccak256(spendingAccount.publicKey);
  const viewingPubKeyHash = keccak256(viewingAccount.publicKey);
  
  const stealthMetaAddress = getAddress(
    keccak256(
      encodePacked(['bytes32', 'bytes32'], [spendingPubKeyHash, viewingPubKeyHash])
    ).slice(0, 42) as `0x${string}`
  );
  
  // Kernel's main wallet address (where they want swept funds to go)
  const mainWalletAddress = spendingAccount.address; // Use spending key's address as main wallet
  
  return {
    spendingPrivateKey,
    viewingPrivateKey,
    spendingPublicKey: spendingAccount.publicKey,
    viewingPublicKey: viewingAccount.publicKey,
    stealthMetaAddress,
    mainWalletAddress, // This is where swept funds should go
  };
}

// Generate a stealth address for a payment
export function generateStealthAddress(
  recipientSpendingPublicKey: `0x${string}`,
  recipientViewingPublicKey: `0x${string}`
): StealthAddress {
  console.log("=== GENERATING STEALTH ADDRESS ===");
  console.log("Recipient Spending Public Key:", recipientSpendingPublicKey);
  console.log("Recipient Viewing Public Key:", recipientViewingPublicKey);
  
  // Generate ephemeral key pair
  const ephemeralPrivateKey = generatePrivateKey();
  const ephemeralAccount = privateKeyToAccount(ephemeralPrivateKey);
  const ephemeralPublicKey = ephemeralAccount.publicKey;
  
  console.log("Generated Ephemeral Private Key:", ephemeralPrivateKey.slice(0, 10) + "...");
  console.log("Generated Ephemeral Public Key:", ephemeralPublicKey);
  
  // Create shared secret using ephemeral private key and recipient viewing public key
  // Concatenate the keys as bytes and hash
  const sharedSecret = keccak256(
    concat([ephemeralPrivateKey, recipientViewingPublicKey])
  );
  
  console.log("Shared Secret:", sharedSecret);
  
  // Generate stealth private key by combining spending public key with shared secret
  const stealthPrivateKey = keccak256(
    concat([recipientSpendingPublicKey, sharedSecret])
  );
  
  console.log("Stealth Private Key:", stealthPrivateKey.slice(0, 10) + "...");
  
  const stealthAccount = privateKeyToAccount(stealthPrivateKey);
  const stealthAddress = getAddress(stealthAccount.address);
  
  console.log("Generated Stealth Address:", stealthAddress);
  
  // Generate view tag (first byte of shared secret)
  const viewTag = parseInt(sharedSecret.slice(2, 4), 16);
  
  console.log("View Tag:", viewTag);
  console.log("=== STEALTH ADDRESS GENERATION COMPLETE ===");
  
  return {
    stealthAddress,
    ephemeralPublicKey,
    viewTag,
  };
}

// Generate Kernel's stealth keys properly
const kernelKeys = generateStealthKeys();

export const KERNEL_STEALTH_KEYS: StealthKeyPair = kernelKeys;

// For debugging - log Kernel's keys
console.log('Generated Kernel stealth keys:', {
  spendingAddress: privateKeyToAccount(kernelKeys.spendingPrivateKey).address,
  viewingAddress: privateKeyToAccount(kernelKeys.viewingPrivateKey).address,
  stealthMetaAddress: kernelKeys.stealthMetaAddress,
  mainWalletAddress: kernelKeys.mainWalletAddress, // NEW: Where swept funds go
});
