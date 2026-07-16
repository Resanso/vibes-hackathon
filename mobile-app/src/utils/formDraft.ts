// Lets a screen survive in-session navigation without losing in-progress
// input, without promoting screen-local fields into the global session store
// (see sessionStore.ts's comment on why financial fields stay local).
//
// In-memory only, not @react-native-async-storage/async-storage — that
// package's native module wasn't compiled into the currently installed
// dev-client build, so it crashed at runtime (NativeModule: AsyncStorage is
// null). This still satisfies "don't lose input moving between screens";
// it just won't survive a full app kill. Swap back to AsyncStorage once a
// native rebuild that includes it is available.
const drafts = new Map<string, Record<string, string>>();

export async function loadDraft<T extends Record<string, string>>(
  screenKey: string,
): Promise<Partial<T>> {
  return (drafts.get(screenKey) as Partial<T>) ?? {};
}

export function saveDraft<T extends Record<string, string>>(
  screenKey: string,
  values: T,
): void {
  drafts.set(screenKey, values);
}
