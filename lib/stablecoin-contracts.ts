// Stablecoin contract addresses and ABIs for Base Sepolia
export const stablecoinContracts = {
  USDC: {
    address: "0x29F45fc3eD1d0ffaFb5e2af9Cc6C3AB1555cd5a2" as const, // Use EXP1 contract as USDC for demo
    decimals: 18, // EXP1 uses 18 decimals
    symbol: "USDC",
    name: "USD Coin (Demo)",
  },
  DAI: {
    address: "0x29F45fc3eD1d0ffaFb5e2af9Cc6C3AB1555cd5a2" as const, // Same contract
    decimals: 18,
    symbol: "DAI",
    name: "Dai Stablecoin (Demo)",
  },
  USDT: {
    address: "0x29F45fc3eD1d0ffaFb5e2af9Cc6C3AB1555cd5a2" as const, // Same contract
    decimals: 18,
    symbol: "USDT",
    name: "Tether USD (Demo)",
  },
} as const;

// Standard ERC20 ABI for stablecoins
export const erc20Abi = [
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
    ],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "result", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export type StablecoinType = keyof typeof stablecoinContracts;
