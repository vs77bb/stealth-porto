"use client";

import { PropsWithChildren } from "react";
import { useConnect } from "wagmi";

export function SignInButton({ children = "Sign in" }: PropsWithChildren) {
  const { connectors, connect } = useConnect();
  const connector = connectors.find(
    (connector) => connector.id === "xyz.ithaca.porto",
  );

  return (
    <button
      disabled={!connector}
      onClick={() => {
        if (!connector) throw new Error("Missing connector");
        connect({ connector });
      }}
      className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-colors duration-200 outline-1 outline-dashed outline-offset-2 outline-blue-400"
    >
      {children}
    </button>
  );
}
