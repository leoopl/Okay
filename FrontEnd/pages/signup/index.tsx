import { Button, Grid, TextField } from '@mui/material';
import {
	AutocompleteElement,
	DatePickerElement,
	FormContainer,
	PasswordElement,
	PasswordRepeatElement,
	TextFieldElement,
	useForm,
} from 'react-hook-form-mui';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import style from './signup.module.css';
import Image from 'next/image';
import Link from 'next/link';

type InputForm = {
	name: string;
	sobrenome: string;
	email: string;
	password: string;
	password_repeat: string;
	auto: string;
	date: string;
};

export default function Signup() {
	const options = [
		{ id: 1, label: 'Mulher cisgênera' },
		{ id: 2, label: 'Homem cisgênero' },
		{ id: 3, label: 'Mulher transexual/transgênera' },
		{ id: 4, label: 'Homem transexual/transgênero' },
		{ id: 5, label: 'Não binário' },
	];

	function handleSubmit(data: InputForm) {
		return;
	}

	//TODO: calendario aparecendo no canto superior esquerdo, corrigir!!

	return (
		<Grid container className={style.backGroundGrid} spacing={3}>
			<Image width={240} height={200} src="/login2.png" alt="brain-woman" />
			<LocalizationProvider dateAdapter={AdapterMoment}>
				<FormContainer onSuccess={handleSubmit}>
					<Grid className={style.form}>
						<TextFieldElement name="name" label="Nome" required variant="outlined" margin="dense" />
						<TextFieldElement
							name="sobrenome"
							label="Sobrenome"
							variant="outlined"
							margin="dense"
						/>
						<TextFieldElement
							name="email"
							type="email"
							label="E-mail"
							required
							variant="outlined"
							margin="dense"
							fullWidth
						/>
						<PasswordElement margin="dense" label="Senha" required name="password" fullWidth />
						<PasswordRepeatElement
							passwordFieldName="password"
							name="password-repeat"
							margin="dense"
							label="Repita a Senha"
							required
							fullWidth
						/>
						<AutocompleteElement name="genre" label="Sexo" options={options} />
						<DatePickerElement isDate label="Data de Nascimento" name="birthDate" />
						<Button type="submit" color="primary">
							Cadastra-se
						</Button>
						<p className={style.p}>
							Já tem uma conta? <Link href="/login">Entrar</Link>
						</p>
					</Grid>
				</FormContainer>
			</LocalizationProvider>
		</Grid>
	);
}
