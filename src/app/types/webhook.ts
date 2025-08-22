export type WebhookRelayRequest = {
    payload: unknown;
    webhook?: string;                 // não use em prod (fixe por ENV)
    extraHeaders?: Record<string,string>;
  };
  