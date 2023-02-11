import { Container, Grid, Typography, Box } from '@mui/material';
import { AspectRatio, CardOverflow } from '@mui/joy';
import Card from '@mui/joy/Card';
import style from './professionalhelp.module.css';
import professionals from '../api/professionals.json';
import { useRouter } from 'next/router';

export default function ProfessionalHelp() {
	const router = useRouter();
	return (
		<Container className={style.container}>
			<Box className={style.topBox}>
				<Typography variant="h1">Title</Typography>
				<img alt="professional image" src="professional.svg" />
			</Box>
			<Grid
				container
				spacing={{ xs: 2, md: 3 }}
				columns={{ xs: 4, sm: 8, md: 12 }}
				className={style.gridContainer}
			>
				{professionals.map(item => (
					<Grid item xs={12} sm={6} md={6} key={item.id} className={style.gridItem}>
						<Card
							variant="outlined"
							className={style.card}
							row
							onClick={() =>
								router.push({
									pathname: `/professionalhelp/${item.id}`,
									query: { data: JSON.stringify(item) },
								})
							}
						>
							<CardOverflow>
								<AspectRatio ratio="1" className={style.ratio}>
									<img src={item.photo} alt="perfil photo" />
								</AspectRatio>
							</CardOverflow>
							<div>
								<Typography variant="h2">{item.name}</Typography>
								<Typography variant="h6">{item.profession}</Typography>
								<Typography variant="body2">{item.resume}</Typography>
							</div>
						</Card>
					</Grid>
				))}
			</Grid>
		</Container>
	);
}
