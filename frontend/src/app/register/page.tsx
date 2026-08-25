"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import TelegramLoginButton from "@/components/TelegramLoginButton";

export default function RegisterPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-md mx-auto px-4 py-10 md:py-16">
      <div className="animate-fade-in-up">
        <div className="text-center mb-8">
          <span className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] items-center justify-center display font-bold text-2xl shadow-[0_10px_30px_rgba(212,175,55,0.4)] mb-5 animate-float">
            I
          </span>
          <h1 className="display text-3xl font-bold text-foreground">{t("register.title")}</h1>
          <p className="text-sm text-muted mt-2">{t("register.step1Desc")}</p>
          <div className="gold-line w-24 mx-auto mt-5" />
        </div>

        <div className="card p-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          <TelegramLoginButton />

          <div className="mt-5 text-center text-sm text-muted">
            {t("register.hasAccount")}{" "}
            <Link href="/login" className="text-gold font-semibold hover:text-gold-light transition-colors">
              {t("register.loginLink")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
