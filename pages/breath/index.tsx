import { Box, Button, Fade, Typography } from '@mui/material';
import style from './breath.module.css';
import data from '../api/breath.json';
import { useRef, useState } from 'react';
import { ModalClose, Modal, Sheet } from '@mui/joy';
import { gsap } from 'gsap';
import Image from 'next/image';

interface Item {
	id: number;
	name: string;
	desc: string;
	secs: number[];
	bgcolor: string;
}

export default function Breathing() {
	const [open, setOpen] = useState(false);
	const [modalData, setModalData] = useState<Item>();
	const [guideMessage, setGuideMessage] = useState<string>('Ready...😃'); // Variable for each round: breathe in, out or hold in.
	const visualAnimationRef = useRef<HTMLSpanElement>(null); // Animation span reference
	const redenElement = useRef(null);
	let countdownSeconds: number = 4;
	let interval: ReturnType<typeof setInterval>;

	const breathingTime: number[] = [4, 7, 8, 0];

	// Second Mondal Children, The animation Mondal
	function SecondModal() {
		const [open, setOpen] = useState(false);
		var countRepeat: number = 4;

		const handleOpen = () => {
			setOpen(true);
			if (redenElement.current) {
				countdownTimer();
			}
		};
		const handleClose = () => {
			clearInterval(interval);
			interval = setInterval(() => {
				if (countdownSeconds <= 0) {
					clearInterval(interval);
					setOpen(false);
				}
				countdownSeconds--;
			}, 1000);
		};

		//TODO: O problema é que a animação não ta considerando o mondal como um objeto renderizado.
		// Countdown timer to start the animation
		const countdownTimer = () => {
			interval = setInterval(() => {
				if (countdownSeconds <= 0) {
					clearInterval(interval);
					if (redenElement.current) {
						startAnimation();
					}
					return;
				}
				setGuideMessage(`Ready...😃   ${countdownSeconds}`);
				countdownSeconds--;
			}, 1000);
		};

		// Star the full animation
		const startAnimation = () => {
			var tl = gsap.timeline({
				repeat: countRepeat,
				repeatDelay: breathingTime[3],
				onComplete: () => {
					setGuideMessage('Complete 😊');
					handleClose();
				},
			});
			tl.to(visualAnimationRef.current, {
				onStart: () => setGuideMessage('Breath In'),
				duration: breathingTime[0],
				transform: 'scale(.95)',
				onComplete: () => setGuideMessage('Hold In'),
			}).to(visualAnimationRef.current, {
				delay: breathingTime[1],
				onStart: () => setGuideMessage('Breath Out'),
				duration: breathingTime[2],
				transform: 'scale(.65)',
				onComplete: () => setGuideMessage('Hold Out'),
			});
		};

		return (
			<>
				<Button onClick={handleOpen} className={style.startButton}>
					Start
				</Button>
				<Modal
					aria-labelledby="second-modal-title"
					aria-describedby="second-modal-desc"
					open={open}
					onClose={(_, reason) => {
						reason === 'closeClick' && setOpen(false);
					}}
				>
					<Fade in={open} timeout={800}>
						<Sheet className={style.secondModal}>
							<ModalClose variant="solid" className={style.closeButton2} />
							<Typography variant="h4" className={style.secondModalTitle}>
								{guideMessage}
							</Typography>
							<Box className={style.breathBox} ref={redenElement}>
								<span className={style.breathSpan} ref={visualAnimationRef}></span>
								{/* <button onClick={countdownTimer}>aqui</button> */}
							</Box>
						</Sheet>
					</Fade>
				</Modal>
			</>
		);
	}

	// Determine number of rounds for a two minute (120s/2min) session
	const determineRounds = (secondsArr: number[]) => {
		if (!Array.isArray(secondsArr) || !secondsArr.every(n => typeof n === 'number')) {
			return 0;
		}

		let totalSeconds = secondsArr.reduce((sum, breath) => sum + breath);
		return Math.ceil(120 / totalSeconds);
	};

	return (
		<Box className={style.boxContainer}>
			<Box className={style.top}>
				<Image width={200} height={200} alt="breath-avatar" src="/meditation1.svg" />
				<Typography variant="h2" className={style.title}>
					Técnicas de respiração
				</Typography>
				<Typography variant="caption" className={style.subtitle}>
					Pratique técnicas de respiração comuns para reduzir o estresse e manter a calmar.
				</Typography>
			</Box>
			<Box className={style.techniques}>
				{data.map(item => (
					<>
						<Button
							sx={{ backgroundColor: `${item.bgcolor}` }}
							className={style.breathButtons}
							key={item.id}
							onClick={() => {
								setModalData(item);
								setOpen(true);
							}}
						>
							{item.name}
							<span>Click to view</span>
						</Button>
						<Modal
							aria-labelledby="modal-title"
							aria-describedby="modal-desc"
							open={open}
							onClose={(event, reason) => {
								reason === 'closeClick' && setOpen(false);
							}}
							className={style.modal}
						>
							<Sheet className={style.sheetBox} color="neutral" variant="soft">
								<ModalClose variant="solid" className={style.closeButton} />
								<Box className={style.imageBox}>
									<img alt="random-image" src={`./breath${modalData?.id}.svg`} />
								</Box>
								<Typography variant="h3" id="modal-title" className={style.modalTitle}>
									{modalData?.name}
								</Typography>
								<Typography id="modal-desc" className={style.descriptionText}>
									{modalData?.desc}
								</Typography>
								<span>Fique confortável e comece a respirar.</span>
								<SecondModal />
								{/* secs={modalData?.secs || []} */}
							</Sheet>
						</Modal>
					</>
				))}
			</Box>
		</Box>
	);
}
