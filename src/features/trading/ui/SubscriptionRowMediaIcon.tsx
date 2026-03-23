"use client";

import { Smartphone, Wallet } from "lucide-react";
import { SiNetflix, SiYoutube } from "react-icons/si";

import { pickSubscriptionRowMediaKind } from "@/features/trading/utils/subscriptionCredentialHints";

type SubscriptionRowMediaIconProps = {
  categoryName: string;
  title: string;
  youtubeAccountEmail?: string | null;
  netflixAccountEmail?: string | null;
  netflixAccountPassword?: string | null;
};

const wrap = "flex size-10 shrink-0 items-center justify-center rounded-xl";

/**
 * Lucide không có logo thương hiệu; theo tech-stack dùng react-icons (Simple Icons) cho YouTube/Netflix.
 * Gói SIM/4G/5G: Lucide Smartphone (không có icon 5G chuyên biệt trong bộ mặc định).
 */
export function SubscriptionRowMediaIcon({
  categoryName,
  title,
  youtubeAccountEmail,
  netflixAccountEmail,
  netflixAccountPassword,
}: SubscriptionRowMediaIconProps) {
  const kind = pickSubscriptionRowMediaKind({
    categoryName,
    title,
    youtubeAccountEmail,
    netflixAccountEmail,
    netflixAccountPassword,
  });

  if (kind === "NETFLIX") {
    return (
      <div className={`${wrap} bg-red-600/10 text-red-700`} title="Netflix">
        <SiNetflix className="size-5" aria-hidden />
      </div>
    );
  }

  if (kind === "YOUTUBE") {
    return (
      <div className={`${wrap} bg-red-500/10 text-red-600`} title="YouTube / Google">
        <SiYoutube className="size-5" aria-hidden />
      </div>
    );
  }

  if (kind === "SIM") {
    return (
      <div className={`${wrap} bg-sky-500/10 text-sky-700`} title="SIM / data">
        <Smartphone className="size-5" aria-hidden />
      </div>
    );
  }

  return (
    <div className={`${wrap} bg-primary/10 text-primary`} title="Dịch vụ">
      <Wallet className="size-5" aria-hidden />
    </div>
  );
}
