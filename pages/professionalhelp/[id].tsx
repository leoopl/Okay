import { Button } from '@mui/joy';
import { Container, Typography, Box } from '@mui/material';
import { useRouter } from 'next/router';
import style from './professionalhelp.module.css';
import Image from 'next/image';

//TODO: ocutar as informações que estão sendo mostradas no link
export default function ProfessonalsProfile() {
	const router = useRouter();
	const userData = JSON.parse(router.query.data as string);
	console.log(userData.photo);
	return (
		<Container className={style.profileContainer}>
			<Box className={style.centerBox}>
				<Image width={220} height={220} src={`/${userData.photo}`} alt="profile picture" />
				<Typography variant="h2">{userData.name}</Typography>
				<Typography variant="h6">{userData.profession}</Typography>
				<Typography variant="body2">{userData.resume}</Typography>
				<Typography variant="body2">{userData.email}</Typography>
				<Typography variant="body2">{userData.number}</Typography>
				<Typography variant="body2">Adress</Typography>
				<Button>Marcar consulta</Button>
			</Box>
		</Container>
	);
}
