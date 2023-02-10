// import { LoadingButton } from '@mui/lab';
import { Alert, Button, Grid, Stack, TextField } from '@mui/material';
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
	//TODO: corrigir imagem sobrepondo a navbar
	return (
		<Grid container className={styled.backGroundGrid}>
			<img className={styled.loginImage} src="login.png" alt="experience" />
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
						Ainda não tem conta? <a href="/signup">Cadastre-se aqui</a>
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
