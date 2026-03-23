export type SubscriptionCredentialHints = {
  showYoutube: boolean;
  showNetflix: boolean;
  /** Gói SIM / data — không có ô riêng trong DB, chỉ gợi ý UI */
  showSimDataHint: boolean;
};

export type SubscriptionRowMediaKind = "NETFLIX" | "YOUTUBE" | "SIM" | "GENERIC";

/**
 * Một dòng bảng chỉ hiển thị **một** icon. Tên danh mục / tên gói được ưu tiên hơn field tài khoản
 * (tránh Netflix VIP nhưng còn Gmail YouTube → không chồng 2 logo).
 */
export function pickSubscriptionRowMediaKind(input: {
  categoryName: string;
  title: string;
  youtubeAccountEmail?: string | null;
  netflixAccountEmail?: string | null;
  netflixAccountPassword?: string | null;
}): SubscriptionRowMediaKind {
  const hay = `${input.categoryName} ${input.title}`.toLowerCase();
  const hasYoutubeValue = Boolean((input.youtubeAccountEmail ?? "").trim());
  const hasNetflixValue =
    Boolean((input.netflixAccountEmail ?? "").trim()) || Boolean((input.netflixAccountPassword ?? "").trim());

  const nameNetflix = /netflix/i.test(hay);
  const nameYoutube = /youtube|yt\s*premium|\byt\b|google\s*one|youtube\s*music/i.test(hay);
  const nameSim = /\b(4g|5g|lte|viettel|mobifone|vinaphone|\bsim\b|gói\s*data)\b/i.test(hay);

  if (nameNetflix) return "NETFLIX";
  if (nameYoutube) return "YOUTUBE";
  if (nameSim) return "SIM";

  if (hasNetflixValue) return "NETFLIX";
  if (hasYoutubeValue) return "YOUTUBE";

  return "GENERIC";
}

/**
 * Gợi ý ô tài khoản khi gia hạn / hiển thị icon bảng.
 * Nếu đã có dữ liệu lưu (YouTube/Netflix) thì vẫn hiện ô để sửa.
 */
export function getSubscriptionCredentialHints(input: {
  categoryName: string;
  title: string;
  youtubeAccountEmail?: string | null;
  netflixAccountEmail?: string | null;
  netflixAccountPassword?: string | null;
}): SubscriptionCredentialHints {
  const hay = `${input.categoryName} ${input.title}`.toLowerCase();
  const hasYoutubeValue = Boolean((input.youtubeAccountEmail ?? "").trim());
  const hasNetflixValue =
    Boolean((input.netflixAccountEmail ?? "").trim()) || Boolean((input.netflixAccountPassword ?? "").trim());

  const nameHintsYoutube = /youtube|yt\s*premium|\byt\b|google\s*one|youtube\s*music/i.test(hay);
  const nameHintsNetflix = /netflix/i.test(hay);
  const nameHintsSim = /\b(4g|5g|lte|viettel|mobifone|vinaphone|\bsim\b|gói\s*data)\b/i.test(hay);

  const showYoutube = nameHintsYoutube || hasYoutubeValue;
  const showNetflix = nameHintsNetflix || hasNetflixValue;
  const showSimDataHint = nameHintsSim && !showYoutube && !showNetflix;

  return { showYoutube, showNetflix, showSimDataHint };
}
