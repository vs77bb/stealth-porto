import { exp1Config } from "@/lib/contracts";
import { CircleUserRound, HandCoins } from "lucide-react";
import { Provider, Value } from "ox";
import { UserRejectedRequestError } from "ox/Provider";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BaseError,
  useAccount,
  useBlockNumber,
  useReadContract,
  useSendCalls,
} from "wagmi";

const formatter = new Intl.NumberFormat("en-US", {
  maximumSignificantDigits: 4,
});

export function format(num: bigint | number | undefined, units = 18) {
  if (!num) return "0";
  return formatter.format(
    typeof num === "bigint" ? Number(Value.format(num, units)) : num,
  );
}

export function Tip() {
  const account = useAccount();
  const creatorAddress = "0xA0Cf798816D4b9b9866b5330EEa46a18382f251e";
  const [success, setSuccess] = useState(false);
  const { data: blockNumber } = useBlockNumber({
    watch: {
      enabled: true,
      pollingInterval: 1000,
    },
  });
  const { data: exp1Balance, refetch: expBalanceRefetch } = useReadContract({
    abi: exp1Config.abi,
    address: exp1Config.address,
    args: [creatorAddress],
    functionName: "balanceOf",
  });
  const { data: userExp1Balance, refetch: userExpBalanceRefetch } =
    useReadContract({
      abi: exp1Config.abi,
      address: exp1Config.address,
      args: [account.address!],
      functionName: "balanceOf",
      query: {
        enabled: !!account.address,
      },
    });
  useEffect(() => {
    expBalanceRefetch();
    userExpBalanceRefetch();
  }, [blockNumber]);

  // Since we use USDC as the fee token in production,
  // we will mint EXP to the user if they don't have any
  // in the call bundle.
  const shouldMintExp =
    userExp1Balance && userExp1Balance < Value.fromEther("1");

  const { isPending, sendCalls } = useSendCalls({
    mutation: {
      onSuccess() {
        setSuccess(true);
      },
      onError(err) {
        const error = (() => {
          if (err instanceof BaseError)
            return err instanceof BaseError
              ? err.walk((err) => err instanceof UserRejectedRequestError)
              : err;
          return err;
        })();

        if (
          (error as Provider.ProviderRpcError)?.code !==
          Provider.UserRejectedRequestError.code
        )
          toast.error("Send Tip Failed", {
            description: err?.message ?? "Something went wrong",
          });
      },
    },
  });

  return (
    <div className="flex w-full max-w-[200px] flex-col items-center gap-3">
      <div className="flex w-full flex-col items-center gap-2">
        <CircleUserRound size={48} />
        <div className="h-5 w-full max-w-[138px] rounded-full bg-gray-200" />
        <div className="h-3.5 w-full rounded-full bg-gray-100 px-1.5" />
      </div>

      <div className="flex w-full justify-between gap-2 px-1.5 text-sm">
        <div className="text-gray-500">Received</div>{" "}
        <div className="font-medium ">
          <span className="text-gray-900 font-semibold">
            {format(exp1Balance ?? 0)}
          </span>{" "}
          <span className="text-gray-500">EXP1</span>
        </div>
      </div>

      <button
        className={
          "flex py-2 min-w-[200px] items-center justify-center gap-1.5 rounded-xl font-medium" +
          (isPending
            ? " bg-gray-200 text-gray-500"
            : " bg-blue-500 hover:bg-blue-600 text-white outline-1 outline-dashed outline-blue-400 outline-offset-2")
        }
        disabled={isPending}
        onClick={() => {
          const shared = {
            abi: exp1Config.abi,
            to: exp1Config.address,
          };
          const amount = Value.fromEther("1");
          sendCalls({
            calls: [
              ...(shouldMintExp
                ? [
                    {
                      ...shared,
                      args: [account.address!, Value.fromEther("101")],
                      functionName: "mint",
                    },
                  ]
                : []),
              {
                ...shared,
                args: [account.address!, amount],
                functionName: "approve",
              },
              {
                ...shared,
                args: [account.address!, creatorAddress, amount],
                functionName: "transferFrom",
              },
            ],
          });
        }}
      >
        {isPending ? (
          "Tipping creator"
        ) : (
          <>
            <HandCoins className="size-4" />
            {success ? "Tip again" : "Send a tip"}
          </>
        )}
      </button>
    </div>
  );
}
