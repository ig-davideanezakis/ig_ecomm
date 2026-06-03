import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { UserRole } from "@/db/schema/auth";

/**
 * Minimum role hierarchy. A higher role includes access to lower routes.
 */
const ROLE_HIERARCHY: Record<string, number> = {
  CUSTOMER: 0,
  STAFF: 1,
  ADMIN: 2,
};

/**
 * Authorize the current session against a required role.
 * If unauthorized, redirects to login or an error page.
 *
 * Returns the session user with role if authorized.
 */
export async function authorize(
  requiredRole: UserRole,
): Promise<{ id: string; role: string; email: string } | null> {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
    return null;
  }

  const userRole = session.user.role;
  const userLevel = ROLE_HIERARCHY[userRole] ?? -1;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? -1;

  if (userLevel < requiredLevel) {
    redirect("/auth/error?error=AccessDenied");
    return null;
  }

  // If 2FA is required and not completed, redirect to verify
  if (session.user.needsTotp && session.user.totpEnabled) {
    redirect("/auth/verify-2fa");
    return null;
  }

  return {
    id: session.user.id,
    role: session.user.role,
    email: session.user.email ?? "",
  };
}

/**
 * Check if a role requires 2FA.
 */
export function isRoleRequiring2fa(role: string): boolean {
  return role === "STAFF" || role === "ADMIN";
}

/**
 * Get the role hierarchy level for comparison.
 */
export function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY[role] ?? -1;
}
