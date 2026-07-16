// Plain fetch, not @trpc/client — there's no shared AppRouter type across
// mobile-app and backend (separate npm projects, no workspace tooling), same
// reasoning already applied in whatsapp-service's backendClient.ts.
//
// Scope cut, noted not hidden: this does not do full SuperJSON date-revival —
// response dates arrive as plain ISO strings, not Date objects. Fine for now
// (profile.upsert's response isn't displayed anywhere yet); revisit once a
// screen needs to format a date coming back from the API (e.g. dashboard.trend).

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SHARED_API_KEY = process.env.EXPO_PUBLIC_SHARED_API_KEY;

if (!BACKEND_URL || !SHARED_API_KEY) {
  throw new Error(
    "EXPO_PUBLIC_BACKEND_URL and EXPO_PUBLIC_SHARED_API_KEY must be set (see .env.example)",
  );
}

export class ApiError extends Error {
  code: string;
  httpStatus: number;

  constructor(message: string, code: string, httpStatus: number) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

interface TrpcSuccessEnvelope<T> {
  result: { data: { json: T } };
}

interface TrpcErrorEnvelope {
  error: {
    json: { message: string; data: { code: string; httpStatus: number } };
  };
}

async function unwrap<T>(response: Response): Promise<T> {
  const body = (await response.json()) as
    | TrpcSuccessEnvelope<T>
    | TrpcErrorEnvelope;

  if ("error" in body) {
    throw new ApiError(
      body.error.json.message,
      body.error.json.data.code,
      body.error.json.data.httpStatus,
    );
  }

  return body.result.data.json;
}

const headers = {
  "Content-Type": "application/json",
  "x-api-key": SHARED_API_KEY,
};

export async function trpcQuery<T>(path: string, input: unknown): Promise<T> {
  const encodedInput = encodeURIComponent(JSON.stringify({ json: input }));
  const response = await fetch(
    `${BACKEND_URL}/api/trpc/${path}?input=${encodedInput}`,
    { headers },
  );
  return unwrap<T>(response);
}

export async function trpcMutation<T>(path: string, input: unknown): Promise<T> {
  const response = await fetch(`${BACKEND_URL}/api/trpc/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ json: input }),
  });
  return unwrap<T>(response);
}

export interface Profile {
  phone: string;
  monthlyIncome: number;
  existingMonthlyDebt: number;
  dependents: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertProfileInput {
  phone: string;
  monthlyIncome: number;
  existingMonthlyDebt: number;
  dependents: number;
}

export function upsertProfile(input: UpsertProfileInput): Promise<Profile> {
  return trpcMutation<Profile>("profile.upsert", input);
}
