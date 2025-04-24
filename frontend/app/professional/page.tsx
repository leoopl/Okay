import Image from 'next/image';
import data from '../../data/professionals.json';

interface IAddress {
  latitude: string;
  longitude: string;
  number: string;
  city: string;
  state: string;
  country: string;
  neighborhood: string;
  street: string;
  zipcode: string;
}

interface IProfessional {
  id: number;
  name: string;
  specialty: string;
  resume: string;
  email: string;
  photo: string;
  number: string;
  address: IAddress;
}

const ProfessionalPage: React.FC = () => {
  const professionals: IProfessional[] = data;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        <div className="px-4">
          <h1 className="small-caps font-varela text-green-dark small-caps mb-8 text-center text-4xl leading-9 font-bold tracking-tight">
            Profissionais de Saúde
          </h1>
        </div>
        <div className="hidden md:flex md:justify-center">
          <Image
            alt="Profisional Image"
            width={500}
            height={500}
            src="/professional.svg"
            className="object-contain"
            priority
          />
        </div>
      </div>
      <div className="mt-8 grid gap-8 sm:grid-cols-3 md:grid-cols-4 md:items-center">
        {professionals.map((professional) => (
          <div
            key={professional.id}
            className="flex flex-col items-center space-y-4 rounded-lg bg-white/50 p-4 shadow-md"
          >
            <Image
              alt="Profisional Image"
              width={100}
              height={100}
              src={professional.photo}
              className="object-contain"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <h2 className="small-caps font-varela text-center text-lg leading-9 font-bold tracking-tight text-gray-900">
              {professional.name}
            </h2>
            <p className="text-center text-gray-500">{professional.specialty}</p>
            <p className="text-center text-gray-500">{professional.email}</p>
            <p className="text-center text-gray-500">{professional.number}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfessionalPage;
