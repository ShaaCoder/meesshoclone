"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  verifyBankAccount,
} from "@/app/actions/admin";

import { useRouter } from "next/navigation";

import {
  Building2,
  CreditCard,
  Smartphone,
  CheckCircle2,
  Clock3,
  User,
  Mail,
  Phone,
  ShieldCheck,
  IndianRupee,
  Search,
  Filter,
} from "lucide-react";

export default function BankClient({
  banks,
}: any) {

  const router = useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  /* FILTER */

  const filteredBanks =
    useMemo(() => {

      return (
        banks?.filter(
          (bank: any) => {

            const query =
              search.toLowerCase();

            const matchesSearch =
              bank.users?.name
                ?.toLowerCase()
                ?.includes(
                  query
                ) ||

              bank.users?.phone
                ?.toLowerCase()
                ?.includes(
                  query
                ) ||

              bank.users?.email
                ?.toLowerCase()
                ?.includes(
                  query
                ) ||

              bank.bank_name
                ?.toLowerCase()
                ?.includes(
                  query
                ) ||

              bank.account_number
                ?.toLowerCase()
                ?.includes(
                  query
                ) ||

              bank.upi_id
                ?.toLowerCase()
                ?.includes(
                  query
                );

            const matchesFilter =
              filter === "all"
                ? true
                : filter ===
                  "verified"
                ? bank.is_verified
                : !bank.is_verified;

            return (
              matchesSearch &&
              matchesFilter
            );
          }
        ) || []
      );
    }, [
      banks,
      search,
      filter,
    ]);

  const pendingCount =
    banks?.filter(
      (b: any) =>
        !b.is_verified
    ).length || 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">

      {/* HEADER */}

      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">

        <div>

          <h1 className="text-4xl font-black ">
            Bank Verification
          </h1>

          <p className="text-zinc-500 mt-2">
            Verify seller payout accounts
          </p>
        </div>

        {/* SEARCH + FILTER */}

        <div className="flex flex-col md:flex-row gap-4">

          {/* SEARCH */}

          <div className="relative w-full md:w-[340px]">

            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search seller, phone, bank..."
              className="w-full h-14 rounded-2xl bg-zinc-900 border border-zinc-800 pl-12 pr-4  outline-none focus:border-zinc-600"
            />
          </div>

          {/* FILTER */}

          <div className="relative">

            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5 pointer-events-none" />

            <select
              value={filter}
              onChange={(e) =>
                setFilter(
                  e.target.value
                )
              }
              className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800 pl-12 pr-10  outline-none appearance-none"
            >

              <option value="all">
                All Accounts
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="verified">
                Verified
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">

          <p className="text-zinc-500 text-sm">
            Total Accounts
          </p>

          <h2 className="text-4xl font-black text-white mt-2">
            {banks?.length || 0}
          </h2>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-6">

          <p className="text-yellow-500 text-sm">
            Pending
          </p>

          <h2 className="text-4xl font-black text-yellow-400 mt-2">
            {pendingCount}
          </h2>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-3xl p-6">

          <p className="text-green-500 text-sm">
            Verified
          </p>

          <h2 className="text-4xl font-black text-green-400 mt-2">
            {
              banks?.filter(
                (b: any) =>
                  b.is_verified
              ).length
            }
          </h2>
        </div>
      </div>

      {/* EMPTY */}

      {!filteredBanks.length && (

        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-20 text-center">

          <Building2 className="w-16 h-16 text-zinc-600 mx-auto" />

          <h2 className="text-2xl font-bold text-white mt-6">
            No Accounts Found
          </h2>

          <p className="text-zinc-500 mt-2">
            Try different search keywords
          </p>
        </div>
      )}

      {/* LIST */}

      <div className="space-y-6">

        {filteredBanks.map(
          (bank: any) => (

            <div
              key={bank.id}
              className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-[32px] overflow-hidden"
            >

              <div className="p-6 flex flex-col xl:flex-row gap-6">

                {/* SELLER */}

                <div className="xl:w-[280px]">

                  <div className="flex items-center gap-4">

                    <div className="w-16 h-16 rounded-3xl bg-zinc-800 flex items-center justify-center">

                      <User className="w-8 h-8 text-white" />
                    </div>

                    <div>

                      <h2 className="text-xl font-black text-white">
                        {
                          bank.users
                            ?.name
                        }
                      </h2>

                      <p className="text-zinc-500 text-sm">
                        Seller Account
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mt-6">

                    <div className="flex items-center gap-3 text-zinc-400 text-sm">

                      <Mail className="w-4 h-4" />

                      {
                        bank.users
                          ?.email
                      }
                    </div>

                    <div className="flex items-center gap-3 text-zinc-400 text-sm">

                      <Phone className="w-4 h-4" />

                      {
                        bank.users
                          ?.phone
                      }
                    </div>
                  </div>
                </div>

                {/* DETAILS */}

                <div className="flex-1 grid md:grid-cols-2 gap-5">

                  {/* BANK */}

                  <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">

                    <div className="flex items-center gap-3">

                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">

                        <CreditCard className="w-6 h-6 text-blue-400" />
                      </div>

                      <div>

                        <p className="text-zinc-500 text-sm">
                          Account Holder
                        </p>

                        <h3 className="text-white font-bold">
                          {
                            bank.account_holder_name
                          }
                        </h3>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3 text-sm">

                      <div className="flex justify-between gap-5">

                        <span className="text-zinc-500">
                          Bank
                        </span>

                        <span className="text-white font-medium">
                          {
                            bank.bank_name
                          }
                        </span>
                      </div>

                      <div className="flex justify-between gap-5">

                        <span className="text-zinc-500">
                          Account
                        </span>

                        <span className="text-green-400 font-bold tracking-wider break-all text-right">
                          {
                            bank.account_number
                          }
                        </span>
                      </div>

                      <div className="flex justify-between gap-5">

                        <span className="text-zinc-500">
                          IFSC
                        </span>

                        <span className="text-white font-semibold">
                          {
                            bank.ifsc_code
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* UPI */}

                  <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">

                    <div className="flex items-center gap-3">

                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">

                        <Smartphone className="w-6 h-6 text-purple-400" />
                      </div>

                      <div>

                        <p className="text-zinc-500 text-sm">
                          UPI ID
                        </p>

                        <h3 className="text-white font-bold break-all">
                          {bank.upi_id ||
                            "No UPI"}
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ACTION */}

                <div className="xl:w-[220px] flex flex-col gap-4">

                  {bank.is_verified ? (

                    <div className="rounded-3xl border border-green-500/20 bg-green-500/10 p-6 text-center">

                      <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />

                      <h3 className="text-green-400 font-bold mt-4">
                        Verified
                      </h3>
                    </div>

                  ) : (

                    <>
                      <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-6 text-center">

                        <Clock3 className="w-10 h-10 text-yellow-400 mx-auto" />

                        <h3 className="text-yellow-400 font-bold mt-4">
                          Pending
                        </h3>
                      </div>

                      <button
                        disabled={
                          isPending
                        }
                        onClick={() =>
                          startTransition(
                            async () => {
                              await verifyBankAccount(
                                bank.seller_id
                              );

                              router.refresh();
                            }
                          )
                        }
                        className="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-700 transition text-white font-bold flex items-center justify-center gap-2"
                      >

                        <ShieldCheck className="w-5 h-5" />

                        Verify Account
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}