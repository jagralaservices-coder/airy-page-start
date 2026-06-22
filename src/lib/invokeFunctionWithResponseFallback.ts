import { supabase } from '@/integrations/supabase/client';

type EdgeResponseLike = {
  clone?: () => EdgeResponseLike;
  status?: number;
  text?: () => Promise<string>;
};

const isResponseLike = (value: unknown): value is EdgeResponseLike => {
  return typeof value === 'object' && value !== null && 'status' in value && 'text' in value;
};

const parseResponseBody = async <T>(response: EdgeResponseLike): Promise<T | null> => {
  const source = typeof response.clone === 'function' ? response.clone() : response;
  const text = typeof source.text === 'function' ? await source.text() : '';

  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

export async function invokeFunctionWithResponseFallback<TResponse>(
  functionName: string,
  body: Record<string, unknown>
): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });

  if (!error) {
    const typedData = data as TResponse & { error?: string; success?: boolean };

    if (typedData?.error) {
      throw new Error(typedData.error);
    }

    if (typedData?.success === false) {
      throw new Error(typedData.error || 'Request failed');
    }

    return typedData;
  }

  const response = (error as { context?: unknown }).context;

  if (isResponseLike(response)) {
    const parsed = await parseResponseBody<TResponse & { error?: string; success?: boolean }>(response);

    if (response.status && response.status >= 200 && response.status < 300 && parsed) {
      if (parsed.error) {
        throw new Error(parsed.error);
      }

      if (parsed.success === false) {
        throw new Error(parsed.error || 'Request failed');
      }

      return parsed;
    }

    if (parsed?.error) {
      throw new Error(parsed.error);
    }
  }

  throw new Error(error.message || 'Request failed');
}