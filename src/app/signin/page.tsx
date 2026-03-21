import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { SignInButton } from "./sign-in-button";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session) {
    redirect("/");
  }

  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="mb-6">
          <Image
            src="/images/ordo-icon.png"
            alt="Ordo HQ"
            width={48}
            height={48}
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome to Ordo HQ
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Sign in with your Ordo Google account to continue.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              {error === "AccessDenied"
                ? "Access denied. Only @ordoschools.com and @ordo.com email addresses are allowed."
                : "An error occurred during sign in. Please try again."}
            </p>
          </div>
        )}

        <SignInButton />

        <p className="text-xs text-gray-400 mt-6">
          Access restricted to @ordoschools.com and @ordo.com accounts.
        </p>
      </div>
    </div>
  );
}
