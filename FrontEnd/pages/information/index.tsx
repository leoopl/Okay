import { Box, Button, ButtonGroup, Typography } from '@mui/material';
import style from './information.module.css';
import informations from '../api/information.json';
import Link from 'next/link';
import Image from 'next/image';

export default function InformationPage() {
	return (
		<Box className={style.containerBox}>
			<Box className={style.initialBox}>
				<Box className={style.informationBox}>
					<Typography variant="h1"> Title </Typography>
					<ButtonGroup
						orientation="vertical"
						aria-label="vertical contained button group"
						variant="text"
					>
						{informations.map(item => (
							<Link key={item.id} href={`/#${item.redirection}`} scroll={false}>
								<Button>{item.illness}</Button>
							</Link>
						))}
					</ButtonGroup>
				</Box>
				<Box className={style.imageBox}>
					<Image
						width={440}
						height={350}
						alt="Girl with social phobia"
						src="/Girl with social phobia.svg"
					/>
				</Box>
			</Box>
			{informations.map(item => (
				<Box className={style.informationSection} key={item.id} id={item.redirection}>
					<Image width={440} height={350} alt="Worries" src="/Worries.svg" />
					<Box className={style.informationBox}>
						<Typography variant="h1"> {item.illness} </Typography>
						<Typography variant="subtitle1"> {item.text} </Typography>
					</Box>
				</Box>
			))}
		</Box>
	);
}

// export const getStaticProps: GetStaticProps<{
// 	informations: Informations[];
// }> = async context => {
// 	const informations: Informations[] = require('../api/information.json');
// 	console.log(informations);
// 	return {
// 		props: {
// 			informations,
// 		},
// 	};
// };
