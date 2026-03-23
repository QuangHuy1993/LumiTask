import { toast } from "sonner";

/**
 * Reusable toast for features that are still under development.
 */
export const showComingSoonToast = () => {
  toast.info("Chức năng đang được phát triển", {
    description: "Chúng tôi đang nỗ lực hoàn thiện tính năng này sớm nhất có thể!",
    duration: 3000,
  });
};
