import { Box, Button, Grid, Typography } from '@mui/joy';
import { useRouter } from 'next/router';
import style from './questionnaire.module.css';

export default function Questionnaire() {
	const router = useRouter();
	return (
		<Box className={style.containerBox}>
			<Box className={style.centerBox}>
				<h1 className={style.title}> Beck Depression Inventory (BDI-II)</h1>
				<h3 className={style.text}>
					Este questionário consiste em 21 grupos de afirmações. Depois de ler cuidadosamente cada
					opção. Selecione a opção que descreve melhor a maneira que você tem se sentido na última
					semana, incluindo hoje. Tome cuidado de ler todas as afirmações, em cada grupo, antes de
					fazer sua escolha.
				</h3>
				<Button
					variant="soft"
					onClick={() => router.push('/questionnaire/0')}
					className={style.button}
				>
					Continue
				</Button>
			</Box>
		</Box>
	);
}
