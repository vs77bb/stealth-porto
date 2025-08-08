import { Value } from "ox";
import type { config } from "./config";
import { exp1Config } from "./contracts";

export type ChainId = (typeof config)["state"]["chainId"];

export const permissions = (chainId: ChainId) =>
  ({
    expiry: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    permissions: {
      calls: [{ to: exp1Config.address[chainId] }],
      spend: [
        {
          limit: Value.fromEther("100"),
          period: "hour",
          token: exp1Config.address[chainId],
        },
      ],
    },
  }) as const;
