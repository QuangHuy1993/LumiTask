"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function PaymentNotificationProvider() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Request Native Notification Permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const eventSource = new EventSource("/api/sse/payments");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.success && data.amount) {
          const formattedAmount = new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
          }).format(data.amount);

          const title = "Nhận thành công!";
          const body = `+${formattedAmount} (${data.content})`;

          // 1. Show Toast on Web
          toast.success(title, { description: body, duration: 8000 });

          // 2. Show Desktop / OS Push Notification
          if ("Notification" in window && Notification.permission === "granted") {
            const notification = new Notification("LumiTask - Có Biến Động Số Dư", {
              body,
              icon: "/favicon.ico", 
              tag: `payment-${data.gatewayTransId || Date.now()}`,
              silent: false, // Plays default notification sound
            });
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          }

          // 3. Emit custom event to trigger red dot in header if applicable
          window.dispatchEvent(new CustomEvent("trigger-red-dot", { detail: data }));

          // 4. Refresh router data silently
          router.refresh();
        }
      } catch (err) {
        // non JSON or comment event
      }
    };

    eventSource.onerror = (error) => {
      // Reconnect automatically, just log silently on client
      // console.warn("SSE reconnecting...", error);
    };

    return () => {
      eventSource.close();
    };
  }, [router]);

  if (!mounted) return null;

  return <></>; // Background component
}
