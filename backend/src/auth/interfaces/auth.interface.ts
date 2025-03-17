export interface IJwtPayload {
  sub: string;
  email: string;
}

export interface IAuthResult {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}
