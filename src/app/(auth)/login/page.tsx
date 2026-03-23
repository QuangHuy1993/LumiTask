"use client";

import React from "react";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { LoginForm } from "@/features/auth/ui/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row overflow-hidden bg-white font-sans">
      {/* Left Side: Hero Section */}
      <div className="hidden md:flex w-1/2 flex-col justify-between p-12 bg-background-light relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-new-primary/10 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-64 h-64 bg-new-secondary/5 rounded-full blur-2xl animate-float-delayed"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 text-new-secondary mb-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="size-10 flex items-center justify-center bg-new-primary rounded-xl text-white shadow-lg"
            >
              <div className="relative">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z"></path>
                  <path d="M12 22V12"></path>
                  <path d="M21 7L12 12L3 7"></path>
                </svg>
              </div>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-black tracking-tighter relative py-1"
            >
              <span className="relative z-10 bg-gradient-to-br from-mint-600 via-primary to-moss-800 bg-clip-text text-transparent drop-shadow-sm">
                LumiTask
              </span>
              <motion.div
                className="absolute bottom-1.5 left-0 right-0 h-1 bg-gradient-to-r from-mint-400/30 to-primary/30 rounded-full z-0"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                transition={{ delay: 0.6, duration: 1, ease: "circOut" }}
              />
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent w-full h-full z-20 pointer-events-none"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                style={{ mixBlendMode: "overlay" }}
              />
            </motion.h2>
          </div>

          <div className="max-w-md animate-fade-in-up">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight mb-6 mt-4">
              Nâng tầm hiệu suất <span className="bg-gradient-to-r from-mint-500 to-primary bg-clip-text text-transparent">công việc</span> của bạn.
            </h1>
            <p className="text-lg text-slate-600 font-medium">
              Hệ thống quản lý công việc chuyên nghiệp giúp đội ngũ cộng tác mượt mà và hiệu quả hơn mỗi ngày.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-auto animate-fade-in-up stagger-1">
          <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
            <img
              alt="Modern workspace collaboration"
              className="w-full h-64 object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiGNdtHub4iJei4tZVlW9njGovorBsQRH38GjSNc7dFLjAP-kxV-L53bZMZ75f7DdqfsrzkUTnejcbjfGt-ybamar5dTiGdeuXGMZkZ7E8GAi0y_Ioo_PNlkuSrbkqyXyFSYq-l4Zdotg9umsj6AxOhUXT_K81Kv1OWKoBacwcXc68PSmvEbFtqyspAf_pw1TODjAeQrncBO8zwk0vgioou-pGVdUFksFQAtBw995m6BqOpPQe8pwd-xa-23xE4bI6pR0tKqrYkpc"
            />
          </div>
          <div className="mt-8 flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3].map((i) => (
                <img
                  key={i}
                  alt={`User ${i}`}
                  className="h-10 w-10 rounded-full border-2 border-white object-cover"
                  src={`https://lh3.googleusercontent.com/aida-public/AB6AXuAv3HC3JK6E9-JMR5agKfolxagkoj_jyYc5MHG7E-Dx1MmoeTh8Y_rOr29_jXE-AREvJSchwOa6C2I1vMr_0jBASV78lu3mzTCgEkSGNyg-ePEa0uW2H8l1zXLaKgsBudV8o00ISd4KicuU1Nlql4EeObWNC020JPZmahY_p9Gfryyav6xAHDAo31xuYrOuuzkcB-enqF8hc6wqco-4_4mh5x_hAsjBj2jlFWyHbrGkY1iTn_2dkjLmxAu9Kzus69EPB63LoT8L84w`}
                />
              ))}
            </div>
            <p className="text-sm font-medium text-slate-500">+2,000 teams trust LumiTask</p>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 md:p-16 bg-white relative">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <footer className="mt-auto pt-8 text-center text-xs text-slate-400 font-bold animate-fade-in-up stagger-4">
          © 2024 LumiTask Inc. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
