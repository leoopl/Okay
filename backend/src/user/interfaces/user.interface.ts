export interface IUser {
  id: string;
  name: string;
  surname?: string;
  email: string;
  password: string;
  birthdate?: Date;
  gender?: string;
}
