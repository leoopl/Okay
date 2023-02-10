import { Container, Grid, Typography } from '@mui/joy';
import style from './homePage.module.css';
export default function HomePage() {
	return (
		<Container className={style.bgContainer}>
			<Grid className={style.gridIntroText}>
				<Typography variant="solid" className={style.introText}>
					Bem-vindo ao Okay?, um lugar onde você pode encontrar o apoio e a orientação de que
					precisa para administrar seus problemas. Entendemos que lidar com essas condições pode ser
					desafiador, mas você não precisa passar por isso sozinho. Nosso site oferece uma variedade
					de recursos e ferramentas, incluindo ferramentas de autoavaliação, estratégias de
					enfrentamento e opções de ajuda profissional, para ajudá-lo a assumir o controle de sua
					saúde mental. Estamos aqui para apoiá-lo em sua jornada e esperamos que considere úteis as
					informações e os recursos em nosso site. Lembre-se de que não há problema em pedir ajuda e
					você merece se sentir melhor. <br /> Okay?
				</Typography>
			</Grid>
			<Grid className={style.gridTreeImage}>
				<img src="./tree.png" className={style.treeImage} alt="tree" />
			</Grid>
		</Container>
	);
}
