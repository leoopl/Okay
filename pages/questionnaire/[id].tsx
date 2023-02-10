import { Radio, RadioGroup, Sheet, Box, Button, FormLabel } from '@mui/joy';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import questions from '../api/Beck.json';
import style from './questionnaire.module.css';

interface QuestionnaireProps {
	allQuestions: { question: string; options: string[] }[];
	questionNumber: { id: number };
}

export async function getServerSideProps(context: any) {
	const questionNumber = context.query;
	const allQuestions = questions;
	return {
		props: { allQuestions, questionNumber },
	};
}

export default function questionnaire({ allQuestions, questionNumber }: QuestionnaireProps) {
	const [selectAnswer, setSelectAnswer] = useState<number>(0);
	const [points, setPoints] = useState<number>(0);
	const [checked, setChecked] = useState<boolean>(true);
	const router = useRouter();
	const currentQuestion = Number(questionNumber.id);
	const { options } = allQuestions[currentQuestion];

	const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		e.preventDefault();
		setChecked(false);
		const awnswerIndex = options.indexOf(e.target.value);
		setSelectAnswer(awnswerIndex);
	}, []);

	const handleNext = () => {
		if (currentQuestion < allQuestions.length - 1) {
			console.log(points, selectAnswer);
			setPoints(points => points + selectAnswer);
			console.log(points, selectAnswer);
			router.push({
				pathname: '/questionnaire/[pid]',
				query: { pid: currentQuestion + 1 },
			});
		} else {
			setPoints(points + selectAnswer);
			setChecked(true);
			router.push(
				{
					pathname: '/result',
					query: { data: points },
				},
				'/result'
			);
		}
	};

	return (
		<Box className={style.containerSupport}>
			<RadioGroup className={style.radioGroup} aria-labelledby="questionLabel">
				{options.map((value: string, index: number) => (
					<Sheet
						key={index}
						sx={{
							p: 2,
							borderRadius: 'md',
							boxShadow: 'sm',
							bgcolor: 'background.body',
						}}
					>
						<Radio
							label={`${value}`}
							overlay
							disableIcon
							onChange={handleChange}
							value={value}
							slotProps={{
								label: ({ checked }) => ({
									sx: {
										fontWeight: 'lg',
										fontSize: 'md',
										color: checked ? 'text.primary' : 'text.secondary',
									},
								}),
								action: ({ checked }) => ({
									sx: theme => ({
										...(checked && {
											'--variant-borderWidth': '2px',
											'&&': {
												// && to increase the specificity to win the base :hover styles
												borderColor: theme.vars.palette.primary[500],
											},
										}),
									}),
								}),
							}}
						/>
					</Sheet>
				))}
			</RadioGroup>
			<Button onClick={handleNext} disabled={checked} className={style.button}>
				Continue
			</Button>
		</Box>
	);
}
