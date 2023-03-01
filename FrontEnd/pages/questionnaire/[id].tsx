import { Radio, RadioGroup, Sheet, Box, Button, FormLabel } from '@mui/joy';
import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import questions from '../api/Beck.json';
import style from './questionnaire.module.css';

type BeckQuestions = {
	id: number;
	options: string[];
	note: null | string;
};

type Props = {
	id: number;
	options: string[];
	totalQuestion: number;
};

export default function questionnaire({ currentInfo }: { currentInfo: Props }) {
	const { id, options, totalQuestion } = currentInfo;
	//console.log(id, options, totalQuestion);
	const [selectAnswer, setSelectAnswer] = useState<number>(0);
	const [points, setPoints] = useState<number>(0);
	const [checked, setChecked] = useState<boolean>(true);
	const router = useRouter();

	const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, options: string[]) => {
		e.preventDefault();
		setChecked(false);
		const awnswerIndex = options.indexOf(e.target.value);
		if (awnswerIndex !== -1) {
			setSelectAnswer(awnswerIndex);
		}
	}, []);

	//#TODO: Contagem de pontos errada.
	const handleNext = () => {
		if (id < totalQuestion - 1) {
			console.log(points, selectAnswer);
			setPoints(points => points + selectAnswer);
			console.log(points, selectAnswer);
			router.push(`/questionnaire/${id + 1}`);
		} else {
			setPoints(points => points + selectAnswer);
			setChecked(true);
			router.push(
				{
					pathname: '/resultpage',
					query: { data: points },
				},
				'/result'
			);
		}
	};

	return (
		<Box className={style.containerSupport}>
			<RadioGroup className={style.radioGroup} aria-labelledby="questionLabel">
				{options?.map((value: string, index: number) => (
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
							onChange={e => handleChange(e, options)}
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

export const getStaticPaths: GetStaticPaths = async () => {
	const data: BeckQuestions[] = questions;
	const paths = data.map(question => ({
		params: { id: question.id.toString() },
	}));

	return {
		paths,
		fallback: false,
	};
};

export const getStaticProps: GetStaticProps<{ currentInfo: Props }> = async context => {
	const data: BeckQuestions[] = questions;
	const totalQuestion = data.length;
	const selectQuestion = data.filter(question => question.id.toString() === context.params?.id)[0];

	const currentInfo = { id: selectQuestion.id, options: selectQuestion.options, totalQuestion };

	return {
		props: { currentInfo },
	};
};
