import Link from "next/link";

import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  IndianRupee,
  Landmark,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
} from "lucide-react";

import { addRefundAccount } from "@/app/actions/users";

export default function BanksPage() {

  return (
    <div className="max-w-7xl mx-auto p-5 md:p-8 space-y-8">

      {/* ============================= */}
      {/* HERO */}
      {/* ============================= */}

      <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-8 md:p-12 text-white shadow-2xl">

        {/* BG EFFECT */}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.20),transparent_30%)]" />

        <div className="absolute -top-20 -right-20 w-72 h-72 bg-green-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-10">

          {/* LEFT */}

          <div className="max-w-3xl">

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 backdrop-blur text-sm font-semibold">

              <ShieldCheck className="w-4 h-4 text-green-400" />

              Secure Refund Protection
            </div>

            <h1 className="text-5xl md:text-7xl font-black mt-6 leading-tight tracking-tight">

              Banks
              <span className="text-green-400">
                {" & "}UPI
              </span>

            </h1>

            <p className="text-zinc-300 text-lg md:text-xl leading-relaxed mt-6 max-w-2xl">

              Add your bank account or UPI details to receive
              fast and secure refunds for returns, cancellations
              and failed deliveries.
            </p>

            {/* FEATURES */}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10">

              <FeatureCard
                icon={Wallet}
                title="Instant UPI"
                description="Receive refunds directly to UPI"
              />

              <FeatureCard
                icon={Banknote}
                title="Bank Transfer"
                description="Secure bank account payouts"
              />

              <FeatureCard
                icon={ShieldCheck}
                title="Protected"
                description="Encrypted payment security"
              />
            </div>
          </div>

          {/* RIGHT CARD */}

          <div className="w-full xl:w-[430px] rounded-[36px] bg-white/10 backdrop-blur-2xl border border-white/10 p-7 shadow-2xl">

            {/* BALANCE */}

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-white/70">
                  Refund Wallet
                </p>

                <div className="flex items-center mt-3">

                  <IndianRupee className="w-10 h-10" />

                  <h2 className="text-5xl font-black">
                    0
                  </h2>
                </div>
              </div>

              <div className="w-16 h-16 rounded-3xl bg-green-500/20 flex items-center justify-center">

                <CreditCard className="w-8 h-8 text-green-400" />
              </div>
            </div>

            {/* BENEFITS */}

            <div className="space-y-4 mt-8">

              <BenefitCard
                icon={CheckCircle2}
                title="Fast Refund Processing"
                description="Refunds processed after QC approval"
              />

              <BenefitCard
                icon={Smartphone}
                title="UPI Supported"
                description="PhonePe, Paytm, GPay & BHIM"
              />

              <BenefitCard
                icon={Sparkles}
                title="Marketplace Protected"
                description="Your refund details are secure"
              />
            </div>

            {/* CTA */}

            <Link
              href="/dashboard/user/returns"
              className="mt-7 w-full h-14 rounded-2xl bg-white text-zinc-900 font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
            >

              View Returns

              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ============================= */}
      {/* CONTENT */}
      {/* ============================= */}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8">

        {/* ============================= */}
        {/* FORM */}
        {/* ============================= */}

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[40px] overflow-hidden shadow-sm">

          {/* HEADER */}

          <div className="p-8 border-b border-zinc-200 dark:border-zinc-800">

            <div className="flex items-center gap-5">

              <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">

                <Landmark className="w-8 h-8 text-zinc-900 dark:text-white" />
              </div>

              <div>

                <h2 className="text-3xl font-black text-zinc-900 dark:text-white">
                  Add Bank or UPI
                </h2>

                <p className="text-zinc-500 mt-1">
                  Add your preferred refund method
                </p>
              </div>
            </div>
          </div>

          {/* FORM */}

          <form
            action={addRefundAccount}
            className="p-8 space-y-8"
          >

            {/* BANK */}

            <div>

              <div className="flex items-center gap-3 mb-6">

                <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-500/10 flex items-center justify-center">

                  <Banknote className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>

                <div>

                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    Bank Account
                  </h3>

                  <p className="text-sm text-zinc-500">
                    Receive refunds directly to your bank
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <Input
                  name="account_holder_name"
                  placeholder="Account Holder Name"
                />

                <Input
                  name="bank_name"
                  placeholder="Bank Name"
                />

                <Input
                  name="account_number"
                  placeholder="Account Number"
                />

                <Input
                  name="ifsc_code"
                  placeholder="IFSC Code"
                />
              </div>
            </div>

            {/* DIVIDER */}

            <div className="relative">

              <div className="absolute inset-0 flex items-center">

                <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              </div>

              <div className="relative flex justify-center">

                <span className="bg-white dark:bg-zinc-900 px-6 text-sm font-bold text-zinc-400">
                  OR
                </span>
              </div>
            </div>

            {/* UPI */}

            <div>

              <div className="flex items-center gap-3 mb-6">

                <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-500/10 flex items-center justify-center">

                  <Smartphone className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                </div>

                <div>

                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    UPI Details
                  </h3>

                  <p className="text-sm text-zinc-500">
                    Receive instant refunds via UPI
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <Input
                  name="upi_id"
                  placeholder="example@oksbi"
                />

                <Input
                  name="phone"
                  placeholder="Phone Number"
                />
              </div>
            </div>

            {/* INFO */}

            <div className="rounded-[32px] bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 p-6">

              <div className="flex items-start gap-4">

                <div className="w-12 h-12 rounded-2xl bg-yellow-100 dark:bg-yellow-500/10 flex items-center justify-center shrink-0">

                  <ShieldCheck className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>

                <div>

                  <h4 className="font-bold text-zinc-900 dark:text-white">
                    Important Information
                  </h4>

                  <ul className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">

                    <li>
                      • Refunds are processed after return quality verification
                    </li>

                    <li>
                      • UPI refunds are usually faster than bank transfers
                    </li>

                    <li>
                      • Double check bank & UPI details before saving
                    </li>

                    <li>
                      • Refunds may take 2-7 working days
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* BUTTON */}

            <button
              type="submit"
              className="w-full h-16 rounded-3xl bg-gradient-to-r from-zinc-900 to-zinc-700 hover:from-black hover:to-zinc-900 text-white font-black text-lg shadow-xl hover:scale-[1.01] transition-all"
            >
              Save Bank & UPI Details
            </button>
          </form>
        </div>

        {/* ============================= */}
        {/* SIDEBAR */}
        {/* ============================= */}

        <div className="space-y-6">

          {/* HOW IT WORKS */}

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[36px] p-7">

            <h3 className="text-2xl font-black text-zinc-900 dark:text-white">
              How Refunds Work
            </h3>

            <div className="mt-7 space-y-5">

              <Step
                number="1"
                title="Return Request"
                description="Customer submits return request"
              />

              <Step
                number="2"
                title="Pickup & QC"
                description="Seller verifies returned item"
              />

              <Step
                number="3"
                title="Refund Credited"
                description="Money transferred to bank or UPI"
              />
            </div>
          </div>

          {/* METHODS */}

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[36px] p-7">

            <h3 className="text-2xl font-black text-zinc-900 dark:text-white">
              Supported Methods
            </h3>

            <div className="mt-6 space-y-4">

              <MethodCard
                title="UPI"
                subtitle="PhonePe, Paytm, Google Pay"
                icon={Wallet}
              />

              <MethodCard
                title="Bank Transfer"
                subtitle="NEFT / IMPS / RTGS"
                icon={Banknote}
              />
            </div>
          </div>

          {/* QUICK ACTION */}

          <div className="rounded-[36px] bg-gradient-to-br from-green-600 to-emerald-700 p-7 text-white">

            <h3 className="text-2xl font-black">
              Need Help?
            </h3>

            <p className="text-white/80 mt-3 leading-relaxed">
              Contact marketplace support if you face any refund issues.
            </p>

            <button className="mt-6 w-full h-14 rounded-2xl bg-white text-zinc-900 font-bold hover:scale-[1.02] transition-all flex items-center justify-center gap-2">

              Contact Support

              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================= */
/* INPUT */
/* ============================= */

function Input({
  name,
  placeholder,
}: any) {

  return (
    <input
      type="text"
      name={name}
      placeholder={placeholder}
      className="h-16 w-full rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-5 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-green-500 transition"
    />
  );
}

/* ============================= */
/* FEATURE */
/* ============================= */

function FeatureCard({
  icon: Icon,
  title,
  description,
}: any) {

  return (
    <div className="rounded-3xl bg-white/10 backdrop-blur border border-white/10 p-5">

      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">

        <Icon className="w-6 h-6 text-white" />
      </div>

      <h3 className="font-bold mt-4">
        {title}
      </h3>

      <p className="text-sm text-white/70 mt-1 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

/* ============================= */
/* BENEFIT */
/* ============================= */

function BenefitCard({
  icon: Icon,
  title,
  description,
}: any) {

  return (
    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">

      <div className="flex items-start gap-3">

        <Icon className="w-5 h-5 text-green-400 mt-0.5" />

        <div>

          <p className="font-semibold">
            {title}
          </p>

          <p className="text-sm text-white/70 mt-1">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================= */
/* STEP */
/* ============================= */

function Step({
  number,
  title,
  description,
}: any) {

  return (
    <div className="flex gap-4">

      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-black text-zinc-900 dark:text-white shrink-0">

        {number}
      </div>

      <div>

        <h4 className="font-bold text-zinc-900 dark:text-white">
          {title}
        </h4>

        <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

/* ============================= */
/* METHOD */
/* ============================= */

function MethodCard({
  title,
  subtitle,
  icon: Icon,
}: any) {

  return (
    <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 flex items-center gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">

      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">

        <Icon className="w-7 h-7 text-zinc-900 dark:text-white" />
      </div>

      <div>

        <h4 className="font-bold text-zinc-900 dark:text-white">
          {title}
        </h4>

        <p className="text-sm text-zinc-500 mt-1">
          {subtitle}
        </p>
      </div>
    </div>
  );
}