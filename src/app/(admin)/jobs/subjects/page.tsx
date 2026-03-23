import { Suspense } from "react";
import { SubjectPageContent } from "@/features/admin-subjects/ui/SubjectPageContent";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Quản lý môn học | LumiTask Admin",
  description: "Quản lý danh mục môn học trong hệ thống LumiTask",
};

/**
 * Trang quản lý môn học chính
 * Sử dụng Suspense và LoadingSkeleton để có trải nghiệm mượt mà
 */
export default function SubjectsPage() {
  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <BookOpen size={24} />
          </div>
          Quản lý danh mục môn học
        </h1>
        <p className="text-slate-500 text-sm mt-2 ml-14 font-medium">
          Tổ chức các loại hình công việc và môn học chuyên môn của bạn
        </p>
      </div>

      {/* Main Content */}
      <Suspense fallback={<LoadingSkeleton message="Đang tải danh sách môn học..." />}>
        <SubjectPageContent />
      </Suspense>
    </div>
  );
}
