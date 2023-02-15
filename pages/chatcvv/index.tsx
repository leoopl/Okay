import { Box } from '@mui/joy';
import Image from 'next/image';
import style from './chatcvv.module.css';

// #TODO: Qualidade da img melhor que do next/image
export default function ChatCvv() {
	return (
		<Box className={style.containerBox}>
			<Box className={style.centerBox}>
				<Image alt="cvv-logo" width={150} height={95} src="/cvv.png" />
				{/* <img src="https://www.cvv.org.br/wp-content/themes/cvv/assets/images/logo.png" /> */}
				<h2 className={style.text}>
					Aqui, como em qualquer outra forma de contato com o CVV, você é atendido por um
					voluntário, com respeito, anonimato, que guardará sigilo sobre tudo que for dito. <br />
					Nossos voluntários são treinados para conversar com todas as pessoas que procuram ajuda e
					apoio emocional.
				</h2>
				<h5 className={style.text}>
					Domingos das 17h às 01h <br />
					Segundas-feiras das 09h às 01h <br />
					Terças-feiras das 09h às 01h <br />
					Quartas-feiras das 09h às 01h <br />
					Quintas-feiras das 09h às 01h <br />
					Sextas-feiras das 15h às 01h <br />
					Sábados das 14h às 01h
				</h5>
				<a
					className={style.link}
					target="_blank"
					href="http://cvvweb.mysuite1.com.br/client/chatan.php?h=&inf=&lfa="
				>
					Clique aqui para iniciar o chat.
				</a>
			</Box>
		</Box>
	);
}
