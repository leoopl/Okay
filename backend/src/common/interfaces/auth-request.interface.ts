export interface IAuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    roles?: string[];
  };
}
