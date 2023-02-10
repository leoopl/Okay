import { KeyboardArrowRight } from '@mui/icons-material';
import { Grid, Box, Button } from '@mui/joy';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import style from '../pages/questionnaire/questionnaire.module.css';

interface Props {
	finalAnswer: string;
	image: string;
}

export default function ResultPage({ finalAnswer, image }: Props) {
	const router = useRouter();
	return (
		<Grid container className={style.containerBox}>
			<Box className={style.centerBox}>
				<img src={image} />
				<h1>{finalAnswer}</h1>
				<Button
					variant="soft"
					endDecorator={<KeyboardArrowRight />}
					color="success"
					onClick={() => router.push('/main')}
				>
					Voltar para o Menu
				</Button>
			</Box>
		</Grid>
	);
}
