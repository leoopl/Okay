import CvvPopover from '../../../pages/chatcvv';
import {
	Card,
	CardOverflow,
	CardContent,
	AspectRatio,
	Typography,
	Avatar,
	Grid,
	Box,
} from '@mui/joy';
import { Button, Popover } from '@mui/material';
import Link from 'next/link';
import React from 'react';
import style from './main.module.css';

export default function MainMenu() {
	const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

	const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget);
	};

	return (
		<Grid container className={style.backGroundGrid}>
			<Card row className={style.topCard}>
				<CardContent>
					<h2 className={style.title}>Bem Vindo!</h2>
					<Link href={'/profile'} className={style.link}>
						<Box className={style.profileBox}>
							<Avatar
								src="https://images.unsplash.com/profile-1502669002421-a8d274ad2897?dpr=2&auto=format&fit=crop&w=32&h=32&q=60&crop=faces&bg=fff"
								size="sm"
								sx={{ '--Avatar-size': '2rem' }}
							/>
							<p>Leonardo Leite</p>
						</Box>
					</Link>
				</CardContent>
				<CardOverflow>
					<AspectRatio ratio="1" sx={{ width: 100 }} objectFit="none">
						<img src="SmileLogo.png" loading="lazy" alt="logo" />
					</AspectRatio>
				</CardOverflow>
			</Card>
			<Link href={'/breath'} className={style.link}>
				<Card className={style.breath}>
					<h1 className={style.h1}>Vamos com calma. Respira</h1>
				</Card>
			</Link>
			<Card row className={style.feeling}>
				<CardOverflow>
					<AspectRatio objectFit="none" ratio="1" sx={{ width: 100 }}>
						<img src="sad.png" alt="happy" />
					</AspectRatio>
				</CardOverflow>
				<h3 className={style.h3}>Como está se sentindo hoje?</h3>
			</Card>
			<Box className={style.middleBox}>
				<Card className={style.professionCard}>
					<h3>Profissionais perto de você. Eles podem te ajudar</h3>
				</Card>
				<Card className={style.routineCard}>
					<h3>Sua rotina não precisa ser chata!</h3>
				</Card>
			</Box>
			<Link href={'/questionnaire'} className={style.link}>
				<Card className={style.beck}>
					<h4>Responda o Beck Depression Inventory - BDI</h4>
				</Card>
			</Link>
			<Button color="inherit" onClick={handleClick}>
				<Card className={style.beck}>
					<h6 className={style.h1}>Precisa de alguém pra conversar? O CVV está aqui por você.</h6>
				</Card>
			</Button>
			<Popover
				anchorEl={anchorEl}
				onClose={() => setAnchorEl(null)}
				open={Boolean(anchorEl)}
				anchorOrigin={{
					vertical: 'center',
					horizontal: 'center',
				}}
				transformOrigin={{
					vertical: 'center',
					horizontal: 'center',
				}}
			>
				<CvvPopover />
			</Popover>
		</Grid>
	);
}
