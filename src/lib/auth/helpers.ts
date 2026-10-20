import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const session = await auth();
    if (!session?.user) return null;

    return {
      id: session.user.id ?? "",
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
      role: (session.user as Record<string, unknown>).role as string ?? "USER",
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return user;
}

export async function getUserSubscription(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
  });
}

export async function getUserUsage(userId: string, period?: string) {
  const currentPeriod = period ?? new Date().toISOString().slice(0, 7);
  return prisma.usageLedger.findMany({
    where: { userId, period: currentPeriod },
    orderBy: { createdAt: "desc" },
  });
}
