"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Package, Factory, ArrowRight } from "lucide-react";
import { setSelectedSignupRole, type SignupRole } from "@/app/lib/role-selection";

interface GetStartedModalProps {
  open: boolean;
  onClose: () => void;
}

export default function GetStartedModal({ open, onClose }: GetStartedModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const chooseRole = (role: SignupRole) => {
    setSelectedSignupRole(role);
    onClose();
    router.push("/signup");
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 py-8"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_-15px_rgba(37,99,235,0.35)]"
      >
        {/* Top accent band */}
        <div className="relative h-20 bg-[#2563EB] sm:h-24">
        

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/15 text-white backdrop-blur-sm transition hover:bg-black/25"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
          <div className="text-center">
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
              How would you like to continue?
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-gray-500">
              Pick your path — rent precision moulds, or list your own and start earning.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:mt-7">
            <button
              type="button"
              onClick={() => chooseRole("customer")}
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/60 px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-transparent hover:bg-[#2563EB] hover:shadow-lg hover:shadow-blue-500/25 sm:px-5"
            >
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-sm transition-transform duration-200 group-hover:scale-110 group-hover:bg-white/15">
                <Package size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-gray-900 transition-colors group-hover:text-white">
                  Start as Customer
                </span>
                <span className="mt-0.5 block text-xs text-gray-500 transition-colors group-hover:text-blue-100">
                  Browse and rent moulds near you
                </span>
              </span>
              <ArrowRight
                size={18}
                className="flex-shrink-0 text-gray-300 transition-all duration-200 group-hover:translate-x-1 group-hover:text-white"
              />
            </button>

            <button
              type="button"
              onClick={() => chooseRole("owner")}
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/60 px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-transparent hover:bg-[#2563EB] hover:shadow-lg hover:shadow-blue-500/25 sm:px-5"
            >
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-sm transition-transform duration-200 group-hover:scale-110 group-hover:bg-white/15">
                <Factory size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-gray-900 transition-colors group-hover:text-white">
                  Start as Host
                </span>
                <span className="mt-0.5 block text-xs text-gray-500 transition-colors group-hover:text-blue-100">
                  List your moulds and start earning
                </span>
              </span>
              <ArrowRight
                size={18}
                className="flex-shrink-0 text-gray-300 transition-all duration-200 group-hover:translate-x-1 group-hover:text-white"
              />
            </button>
          </div>

          <p className="mt-5 text-center text-[11px] text-gray-400">
            You can switch between roles anytime from your profile
          </p>
        </div>
      </div>
    </div>
  );
}
