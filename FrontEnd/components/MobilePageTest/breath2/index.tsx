import { Typography, Box, Grid, Button } from '@mui/joy';
import { useEffect, useRef, useState } from 'react';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import { CSSTransition } from 'react-transition-group';
import style from './breath.module.css';
import { Zoom } from '@mui/material';

export default function BreathTimer() {
	const [key, setKey] = useState<number>(0);
	const [timer, setTimer] = useState<number>(4);
	const [breath, setBreath] = useState<string>('breathIn');
	const [start, setStart] = useState<boolean>(false);

	interface Props {
		remainingTime: number;
		elapsedTime: number;
		color: string;
	}

	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (breath === 'breathIn') {
			interval = setTimeout(() => {}, 4000);
		} else if (breath === 'hold') {
			interval = setTimeout(() => {}, 4000);
		} else if (breath === 'breathOut') {
			interval = setTimeout(() => {}, 6000);
		}
		return () => clearInterval(interval);
	}, [breath]);

	const renderTimer = ({ remainingTime }: Props) => {
		if (breath === 'breathIn') {
			return (
				<CSSTransition in={true} timeout={500} classNames="zoom">
					<div className={style.circleIn}>
						<Typography>Breathe in...</Typography>
					</div>
				</CSSTransition>
			);
		} else if (breath === 'hold') {
			return (
				<CSSTransition in={false} timeout={1000} classNames="zoom">
					<div className={style.circleFull}>
						<Typography>Hold your Breathe...</Typography>
					</div>
				</CSSTransition>
			);
		} else {
			return (
				<CSSTransition in={true} timeout={500} classNames="zoom">
					<div className={style.circleOut}>
						<Typography>Breathe out...</Typography>
					</div>
				</CSSTransition>
			);
		}
	};

	return (
		<Grid container className={style.container}>
			<h1>Mantenha a calma e nos acompanhe</h1>
			<CountdownCircleTimer
				size={266}
				strokeWidth={15}
				key={key}
				colors={['#B0C4DE', '#6495ED', '#F4A460', '#FFD700']}
				colorsTime={[4, 3, 2, 0]}
				isPlaying={start}
				duration={timer}
				onComplete={() => {
					if (breath === 'breathIn') {
						setBreath('hold');
						setTimer(4);
					} else if (breath === 'hold') {
						setBreath('breathOut');
						setTimer(6);
					} else {
						setBreath('breathIn');
						setTimer(4);
					}
					setKey(prevKey => prevKey + 1);
				}}
			>
				{renderTimer}
			</CountdownCircleTimer>
			<Button
				variant="soft"
				color="warning"
				onClick={() => {
					setBreath('breathIn');
					setKey(prevKey => prevKey + 1);
					setStart(!start);
				}}
			>
				{start ? 'Stop' : 'Start'}
			</Button>
		</Grid>
	);
}
