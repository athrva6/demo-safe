export const cloudAuth = Boolean(
  import.meta.env.VITE_COGNITO_USER_POOL_ID &&
  import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
);
let authModule: Promise<typeof import("aws-amplify/auth")> | undefined;
export function configureCloudAuth() {
  return (authModule ??= Promise.all([
    import("aws-amplify"),
    import("aws-amplify/auth"),
  ]).then(([{ Amplify }, auth]) => {
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
          userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
          loginWith: { email: true },
        },
      },
    });
    return auth;
  }));
}
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export async function request(
  path: string,
  init: RequestInit = {},
  authenticated = false,
) {
  const headers = new Headers(init.headers);
  if (authenticated && cloudAuth) {
    const { fetchAuthSession } = await configureCloudAuth();
    const token = (await fetchAuthSession()).tokens?.accessToken.toString();
    if (!token) throw new Error("Please sign in again.");
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new Error(
      typeof problem.detail === "string"
        ? problem.detail
        : `Request failed (${response.status}).`,
    );
  }
  return response;
}

export type Share = {
  id: string;
  title: string;
  created_at: number;
  expires_at: number;
  revoked: boolean;
};
export const shareUrl = (id: string) =>
  `${window.location.origin}/s/${encodeURIComponent(id)}`;
export const dateLabel = (seconds: number) =>
  new Date(seconds * 1000).toLocaleString();
