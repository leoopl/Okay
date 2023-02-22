import { GetStaticPaths, GetStaticProps } from 'next';
import { Button } from '@mui/joy';
import { Container, Typography, Box } from '@mui/material';
import style from './professionalhelp.module.css';
import Image from 'next/image';

type Professionals = {
	id: number;
	name: string;
	profession: string;
	resume: string;
	email: string;
	photo: string;
	number: string;
	address: {
		latitude: string;
		longitude: string;
		number: string;
		city: string;
		state: string;
		country: string;
		neighborhood: string;
		street: string;
		zipcode: string;
	};
};

export default function ProfessonalsProfile({ professional }: { professional: Professionals }) {
	return (
		<Container className={style.profileContainer}>
			<Box className={style.centerBox}>
				<Image width={220} height={220} src={`/${professional.photo}`} alt="profile picture" />
				<Typography variant="h2">{professional.name}</Typography>
				<Typography variant="h6">{professional.profession}</Typography>
				<Typography variant="body2">{professional.resume}</Typography>
				<Typography variant="body2">{professional.email}</Typography>
				<Typography variant="body2">{professional.number}</Typography>
				<Typography variant="body2">Adress</Typography>
				<Button>Marcar consulta</Button>
			</Box>
		</Container>
	);
}

export const getStaticPaths: GetStaticPaths = async () => {
	const professionals: Professionals[] = require('../api/professionals.json');
	const paths = professionals.map(professional => ({
		params: { id: professional.id.toString() },
	}));

	return {
		paths,
		fallback: false,
	};
};

export const getStaticProps: GetStaticProps<{
	professional: Professionals;
}> = async context => {
	const professionals: Professionals[] = require('../api/professionals.json');
	const professional = professionals.filter(
		professional => professional.id.toString() === context.params?.id
	)[0];

	return {
		props: {
			professional,
		},
	};
};
