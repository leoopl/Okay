export interface IUser {
  id: string;
  name: string;
  surname?: string;
  email: string;
  password: string;
  birthdate?: Date;
  gender?: string;
  auth0Id: string;
  created_at: Date;
  updated_at: Date;
}
