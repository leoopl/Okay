import { Box, Button } from '@mui/material';
import Image from 'next/image';
import { useRouter } from 'next/router';
import style from '../styles/404.module.css';

function randomInt(max: number) {
	return Math.floor(Math.random() * max);
}

export default function NotFound() {
	const router = useRouter();
	return (
		<Box className={style.containerBox}>
			<Box className={style.centerBox}>
				<Image width={550} height={440} alt="404" src={`/404${randomInt(4)}.svg`} />
				<h1>Algo inesperado aconteceu, não achamos a página desejada!</h1>
				<Button
					size="large"
					variant="outlined"
					className={style.button}
					onClick={() => router.back()}
				>
					Vamos voltar e tentar de novo?
				</Button>
			</Box>
		</Box>
	);
}
