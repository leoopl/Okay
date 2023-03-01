import { useRouter } from 'next/router';
import ResultPage from '../../components/resultPage';

export default function ResultedPage() {
	const router = useRouter();
	const finalPoints = Number(router.query.data);
	console.log(finalPoints);
	// const finalPoints = 0;

	if (finalPoints <= 10) {
		return <ResultPage finalAnswer={'Esses altos e baixos são normal'} image={'happy'} />;
	} else if (10 < finalPoints && finalPoints <= 16) {
		return (
			<ResultPage
				finalAnswer={'Seu humor pode está um pouco estranho, mas amanhã é um novo dia'}
				image={'happy'}
			/>
		);
	} else if (16 < finalPoints && finalPoints <= 20) {
		return (
			<ResultPage
				finalAnswer={
					'Você pode está um pouco triste e confuso com seus pensamentos, fica calmo, respira. A vida pode ser um pouco complicada as vezes'
				}
				image={'neutral'}
			/>
		);
	} else if (20 < finalPoints && finalPoints <= 30) {
		return (
			<ResultPage
				finalAnswer={
					'Nunca negue ajuda, desabafar com alguém vai te ajudar muito. Temos o chat do CVV pra te escutar'
				}
				image={'neutral'}
			/>
		);
	} else if (30 < finalPoints && finalPoints <= 40) {
		return (
			<ResultPage
				finalAnswer={
					'Um psicologo só vai te ajudar e aliviar tudo isso, não tenha medo de se abrir'
				}
				image={'sad'}
			/>
		);
	} else {
		return (
			<ResultPage
				finalAnswer={
					'Por favor procure ajudar, temos varios medicos que podem te ajudar. Queremos o seu bem'
				}
				image={'sad'}
			/>
		);
	}
}
