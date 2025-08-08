"use client";

import { useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { SignInButton } from "./sign-in-button";

export function Connect() {
  const account = useAccount();
  const { disconnect } = useDisconnect();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (!isMounted) return null;

  if (!account.address) return <SignInButton />;

  return (
    <div className="flex items-center gap-2">
      <div className="text-gray-500 font-medium">
        Signed in as {account.address.slice(0, 6)}...{account.address.slice(-4)}
      </div>
      <button
        onClick={() => disconnect()}
        className="bg-red-100 hover:bg-red-200 text-red-500 font-medium py-2 px-8 rounded-xl transition-colors duration-200"
      >
        Sign out
      </button>
    </div>
  );
}
