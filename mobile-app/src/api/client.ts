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

// Only auth.me needs this — every other router still trusts the shared API
// key alone (see backend/src/server/api/trpc.ts's authedProcedure comment
// for why this wasn't rolled out everywhere yet).
export async function trpcAuthedQuery<T>(path: string, input: unknown, token: string): Promise<T> {
  const encodedInput = encodeURIComponent(JSON.stringify({ json: input }));
  const response = await fetch(
    `${BACKEND_URL}/api/trpc/${path}?input=${encodedInput}`,
    { headers: { ...headers, authorization: `Bearer ${token}` } },
  );
  return unwrap<T>(response);
}

export type NotificationChannel = "whatsapp" | "telegram";

export interface Profile {
  phone: string;
  email: string;
  name: string | null;
  monthlyIncome: number;
  monthlyExpenses: number;
  existingMonthlyDebt: number;
  dependents: number;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  notificationChannel: NotificationChannel;
  telegramChatId: string | null;
}

export interface AuthResult {
  token: string;
  profile: Profile;
}

export interface RegisterInput {
  name: string;
  phone: string;
  email: string;
  password: string;
}

export function register(input: RegisterInput): Promise<AuthResult> {
  return trpcMutation<AuthResult>("auth.register", input);
}

export interface LoginInput {
  email: string;
  password: string;
}

export function login(input: LoginInput): Promise<AuthResult> {
  return trpcMutation<AuthResult>("auth.login", input);
}

// Verifies a stored token is still genuinely valid — used on app boot
// instead of trusting whatever's in SecureStore blindly.
export function getSession(token: string): Promise<Profile> {
  return trpcAuthedQuery<Profile>("auth.me", undefined, token);
}

export interface UpsertProfileInput {
  phone: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  existingMonthlyDebt: number;
  dependents: number;
}

export function upsertProfile(input: UpsertProfileInput): Promise<Profile> {
  return trpcMutation<Profile>("profile.upsert", input);
}

export interface AssessRiskInput {
  phone: string;
  principal: number;
  interestRatePct: number;
  serviceFee: number;
  tenorMonths: number;
}

export type RiskLabel = "aman" | "waspada" | "bahaya";

export interface RiskAssessment {
  id: string;
  riskScore: number;
  riskLabel: RiskLabel;
  reasons: string[];
  explanation: string;
  monthlyInstallment: number;
  totalRepayment: number;
}

export function assessRisk(input: AssessRiskInput): Promise<RiskAssessment> {
  return trpcMutation<RiskAssessment>("risk.assess", input);
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: string;
}

export function listRecommendations(): Promise<Recommendation[]> {
  return trpcQuery<Recommendation[]>("recommendations.list", undefined);
}

export interface Scholarship {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string; // ISO string, not revived to Date — see file header
  scrapedAt: string;
}

export function listScholarships(limit = 20): Promise<Scholarship[]> {
  return trpcQuery<Scholarship[]>("scholarships.list", { limit });
}

// Testing-only, same pattern as debugResetCheckIn/triggerReminders below —
// no scraping cron exists yet, this is how the list actually gets
// populated for now (see ProfileTab's "Refresh Beasiswa" debug button).
export function refreshScholarships(): Promise<{ upserted: number; errors: string[] }> {
  return trpcMutation<{ upserted: number; errors: string[] }>("scholarships.refresh", undefined);
}

export interface TrendEntry {
  createdAt: string; // ISO string, not revived to Date — see file header
  riskScore: number;
  riskLabel: RiskLabel;
  principal: number;
  monthlyInstallment: number;
}

export function getDashboardTrend(phone: string): Promise<TrendEntry[]> {
  return trpcQuery<TrendEntry[]>("dashboard.trend", { phone });
}

export function getProfile(phone: string): Promise<Profile | null> {
  return trpcQuery<Profile | null>("profile.get", { phone });
}

// Testing-only escape hatch — fires an immediate reminder run on whichever
// channel's service instead of waiting for its daily cron. See ProfileTab.
export function triggerReminders(
  channel: NotificationChannel = "whatsapp",
): Promise<{ sent: number }> {
  return trpcMutation<{ sent: number }>("reminders.triggerNow", { channel });
}

// Testing-only escape hatch — creates a RiskEntry with firstDueDate set to
// tomorrow (not the usual +1 calendar month), so triggerReminders() finds
// something to send without needing an artificially widened
// REMINDER_WINDOW_DAYS. See ProfileTab.
export function debugCreateDueEntry(phone: string): Promise<{ id: string; firstDueDate: string }> {
  return trpcMutation<{ id: string; firstDueDate: string }>("reminders.debugCreateDueEntry", {
    phone,
  });
}

// Switches which service sends this student their reminders/quick-consult
// replies. Switching to "telegram" fails (PRECONDITION_FAILED) if the
// student hasn't linked a Telegram chat yet via the bot's /start flow.
export function setNotificationChannel(
  phone: string,
  channel: NotificationChannel,
): Promise<Profile> {
  return trpcMutation<Profile>("profile.setChannel", { phone, channel });
}

// "State 2": tracking payoff progress on a loan the student actually took
// (not just simulated) — see backend/src/server/api/routers/tracking.ts.
export interface TrackingStatus {
  riskEntryId: string;
  principal: number;
  totalRepayment: number;
  startedAt: string;
  dailyTargetAmount: number;
  daysConfirmed: number;
  amountSaved: number;
  remainingAmount: number;
  confirmedToday: boolean;
  // Disposable income (income - expenses) spread across this month —
  // informational, not enforced. See backend's loanTracking.ts.
  dailyDisposableIncome: number;
  targetExceedsDisposableIncome: boolean;
}

export function startTracking(riskEntryId: string): Promise<TrackingStatus> {
  return trpcMutation<TrackingStatus>("tracking.start", { riskEntryId });
}

export function checkInTracking(phone: string): Promise<unknown> {
  return trpcMutation("tracking.checkIn", { phone, source: "app" });
}

export function getTrackingStatus(phone: string): Promise<TrackingStatus | null> {
  return trpcQuery<TrackingStatus | null>("tracking.status", { phone });
}

// Testing-only: flips confirmedToday back to false/null for the caller's
// tracking without waiting for the next calendar day. See ProfileTab.
export function debugResetCheckIn(phone: string): Promise<TrackingStatus | null> {
  return trpcMutation<TrackingStatus | null>("tracking.debugResetCheckIn", { phone });
}

export interface ChatMessage {
  id: string;
  phone: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export function getChatHistory(phone: string): Promise<ChatMessage[]> {
  return trpcQuery<ChatMessage[]>("chat.history", { phone });
}

export function sendChatMessage(phone: string, message: string): Promise<{ reply: string }> {
  return trpcMutation<{ reply: string }>("chat.message", { phone, message });
}
