// import { LoadingButton } from '@mui/lab';
import { Alert, Button, Grid, Stack, TextField } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { FormContainer, TextFieldElement } from 'react-hook-form-mui';
import styled from './login.module.css';

type Inputs = {
	email: string;
	passwordInput: string;
};

export default function Login() {
	const loading = false;
	const onSubmit: SubmitHandler<Inputs> = async data => console.log(data.passwordInput);
	return (
		<Grid container className={styled.backGroundGrid}>
			<Image alt="experience" width={510} height={450} src="/login.png" />
			<h1 className={styled.h1}>ESPERO QUE ESTEJA TENDO UM BOM DIA!</h1>
			<FormContainer onSuccess={onSubmit}>
				<Grid className={styled.form}>
					<TextFieldElement
						name="email"
						label="E-mail"
						variant="outlined"
						size="small"
						type="email"
					/>
					<TextFieldElement
						name="passwordInput"
						label="Senha"
						type="password"
						autoComplete="current-password"
						size="small"
					/>
					<Button variant="outlined" type="submit">
						Entrar
					</Button>
					<p className={styled.p}>
						Ainda não tem conta? <Link href="/signup">Cadastre-se aqui</Link>
					</p>
				</Grid>
			</FormContainer>

			{/* 
					{!loading ? (
						<Button variant="outlined">Fazer login</Button>
					) : (
						<LoadingButton loading variant="outlined" />
					)}
				</form> */}
		</Grid>
	);
}
