import { Box, Button, ButtonGroup, Typography } from '@mui/material';
import style from './information.module.css';
import informations from '../api/information.json';
import Link from 'next/link';

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
						{informations.map((item, index) => (
							<Link href={`/#${item.id}`} scroll={false}>
								<Button key={index}>{item.illness}</Button>
							</Link>
						))}
					</ButtonGroup>
				</Box>
				<Box className={style.imageBox}>
					<img alt="Girl with social phobia" src="Girl with social phobia.svg" />
				</Box>
			</Box>
			{informations.map((item, index) => (
				<Box className={style.informationSection} key={index} id={item.id}>
					<Box className={style.imageBox}>
						<img alt="Worries" src="Worries.svg" />
					</Box>
					<Box className={style.informationBox}>
						<Typography variant="h1"> {item.illness} </Typography>
						<Typography variant="subtitle1"> {item.text} </Typography>
					</Box>
				</Box>
			))}
		</Box>
	);
}
