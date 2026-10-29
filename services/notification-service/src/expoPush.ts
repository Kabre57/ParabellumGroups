export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  channelId: 'operational-requests';
  priority: 'high';
  data: Record<string, unknown>;
};

type ExpoPushResponse = { data?: Array<{ status?: string; message?: string; details?: { error?: string } }> };

export async function sendExpoPushNotification(
  message: ExpoPushMessage,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const response = await fetcher('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  if (!response.ok) throw new Error(`Expo Push API returned ${response.status}`);

  const result = await response.json() as ExpoPushResponse;
  const failedTicket = result.data?.find((ticket) => ticket.status === 'error');
  if (failedTicket) {
    throw new Error(failedTicket.message || failedTicket.details?.error || 'Expo n’a pas accepté le push.');
  }
}
