"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Headset } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleBackHome = () => {
    // Trigger global transition
    window.dispatchEvent(new CustomEvent("trigger-page-transition"));
    
    // Wait for 800ms before navigating
    // This provides a snappy feel and hands over to the persistent transition
    setTimeout(() => {
      router.push("/");
    }, 800);
  };

  // Avoid hydration mismatch by rendering a simplified or null state during SSR if needed,
  // but since we want premium look, we just ensure client-side consistency.
  if (!mounted) {
    // Return a static version without animations for SSR to match initial client shell
    return (
      <div className="bg-background-light font-display min-h-screen flex flex-col items-center justify-center text-center px-6">
         <h1 className="text-[120px] font-black leading-none text-moss-900/10">404</h1>
         <h2 className="text-moss-900 text-3xl font-extrabold -mt-4">Đang tải...</h2>
      </div>
    );
  }

  return (
    <div className="bg-background-light font-display min-h-screen relative overflow-hidden flex flex-col">
      {/* Decorative Lighting Blobs with Framer Motion */}
      <motion.div 
        animate={{
          x: [0, 20, -20, 0],
          y: [0, -30, 30, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-[80px] z-0 pointer-events-none"
      />
      <motion.div 
        animate={{
          x: [0, -40, 40, 0],
          y: [0, 50, -50, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-1/2 -right-24 w-80 h-80 bg-primary/10 rounded-full blur-[80px] z-0 pointer-events-none"
      />
      <motion.div 
        animate={{
          x: [0, 30, -30, 0],
          y: [0, -20, 20, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        className="absolute -bottom-24 left-1/4 w-64 h-64 bg-primary/15 rounded-full blur-[80px] z-0 pointer-events-none"
      />

      <div className="relative z-10 flex flex-col flex-1">
        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="max-w-2xl w-full">
            {/* 404 Visual */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative mb-8"
            >
              <h1 className="text-[120px] md:text-[200px] font-black leading-none text-moss-900/10 select-none tracking-tighter">
                404
              </h1>
            </motion.div>

            {/* Message Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="flex flex-col gap-4 mb-10"
            >
              <h2 className="text-moss-900 text-3xl md:text-4xl font-extrabold leading-tight tracking-tight">
                Oops! Trang bạn tìm kiếm không tồn tại
              </h2>
              <p className="text-slate-600 text-lg max-w-md mx-auto leading-relaxed">
                Có vẻ như đường dẫn này đã bị hỏng hoặc không còn tồn tại trên LumiTask. Đừng lo lắng, hãy để chúng tôi đưa bạn trở về lộ trình làm việc hiệu quả.
              </p>
            </motion.div>

            {/* Call to Action */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button 
                onClick={handleBackHome}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 h-14 bg-primary text-white rounded-xl text-lg font-bold shadow-lg shadow-primary/20 hover:bg-emerald-600 transition-all hover:scale-[1.02] active:scale-95 group"
              >
                <Home className="size-6 transition-transform group-hover:-translate-y-0.5" />
                <span>Quay lại Trang chủ</span>
              </button>
              <button 
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 h-14 bg-white text-moss-900 rounded-xl text-lg font-bold border border-slate-200 shadow-sm hover:bg-slate-50 transition-all hover:scale-[1.02] active:scale-95 group"
              >
                <Headset className="size-6 transition-transform group-hover:-translate-y-0.5" />
                <span>Liên hệ hỗ trợ</span>
              </button>
            </motion.div>

            {/* Illustration Card */}
            <motion.div 
              initial={{ opacity: 0, rotate: 10, scale: 0.9 }}
              animate={{ opacity: 0.8, rotate: 3, scale: 1 }}
              whileHover={{ rotate: 0, scale: 1.05, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mt-16 flex justify-center"
            >
              <div className="w-full max-w-xs aspect-square bg-white rounded-3xl shadow-card p-4 relative overflow-hidden group">
                <img 
                  alt="404 Illustration" 
                  className="w-full h-full object-cover rounded-2xl grayscale group-hover:grayscale-0 transition-all duration-700" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBF4DO8zzHC9xqhWd6FqeYwAjB8vPzYq1VxBRWzWvxdNI5QK2ITqqWLd6uQi0vN1mP0z8Tyr04JhKqDMOjvqSzsULD9nwzA1MLHesBbcWWl47as2FK61zqbOJg_XkBrcOYy-O56peV9E5FDfwKwXSrBg-4W8c5gQFNaGgQtW6lEC-4tBq1Tu6xiaB2gIo9mvvJoPK_eqPJFQzgoeW-W06bwRbO0Vuf0vC94l9J3FGHEwpIL6xJkqzGf6uDbA7SgxGoUvwrlI0LlZ4I"
                />
                <div className="absolute inset-0 bg-primary/10 mix-blend-overlay pointer-events-none"></div>
                
                {/* Shimmer effect on the card */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full h-full z-20 pointer-events-none"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                />
              </div>
            </motion.div>
          </div>
        </main>

        {/* Footer Info */}
        <footer className="py-8 text-center text-slate-400 text-sm">
          <p>© 2024 LumiTask. Nền tảng quản lý công việc tinh tế.</p>
        </footer>
      </div>
    </div>
  );
}
