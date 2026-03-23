import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full">
      <LoadingSkeleton message="Đang tải danh sách đợt làm..." />
    </div>
  );
}

