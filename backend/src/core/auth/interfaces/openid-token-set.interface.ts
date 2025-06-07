export interface OpenIDTokenSet {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  expires_at?: number;
  scope?: string;
}
