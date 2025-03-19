export interface IUser {
  id: string;
  name: string;
  surname?: string;
  email: string;
  password: string;
  gender?: string;
  birthdate?: Date;
  auth0Id: string;
  status: Enumerator;
  consentToDataProcessing: boolean;
  consentToResearch: boolean;
  consentToMarketing: boolean;
  consentUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  roles: string[];
}
