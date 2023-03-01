import {
	AppBar,
	Avatar,
	Box,
	Button,
	ButtonGroup,
	Container,
	IconButton,
	Menu,
	MenuItem,
	Toolbar,
	Tooltip,
	Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import React from 'react';
import style from './navBar.module.css';
import { useRouter } from 'next/router';
import Image from 'next/image';

export default function Navbar() {
	const user = true;
	const pages = [
		{ name: 'Home', link: 'home' },
		{ name: 'Recursos e informações', link: 'information' },
		{ name: 'Técnica de respiração', link: 'breath' },
		{ name: 'Ajuda profissional', link: 'professionalhelp' },
		{ name: 'Chat de suporte', link: 'chatcvv' },
		{ name: 'Como está se sentindo?', link: 'questionnaire' },
	];
	const settings = [
		{ name: 'Profile', link: 'profile' },
		{ name: 'Account', link: 'account' },
		{ name: 'Dashboard', link: 'dashboard' },
		{ name: 'Logout', link: 'logout' },
	];

	const router = useRouter();

	const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);
	const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(null);

	const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorElNav(event.currentTarget);
	};
	const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorElUser(event.currentTarget);
	};

	const handleCloseNavMenu = () => {
		setAnchorElNav(null);
	};

	const handleCloseUserMenu = () => {
		setAnchorElUser(null);
	};

	return (
		<AppBar className={style.navBar}>
			<Container maxWidth="xl">
				<Toolbar disableGutters>
					<Image
						width={32}
						height={56}
						src="/SmileLogo.png"
						alt="Logo"
						className={style.xsLogoImage}
					/>
					<Typography
						variant="h3"
						noWrap
						component="a"
						className={style.logoName}
						href="/"
						sx={{ display: { xs: 'none', md: 'flex' } }}
					>
						Okay?
					</Typography>

					<Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
						<IconButton
							size="large"
							aria-label="account of current user"
							aria-controls="menu-appbar"
							aria-haspopup="true"
							onClick={handleOpenNavMenu}
							color="inherit"
						>
							<MenuIcon />
						</IconButton>
						<Menu
							id="menu-appbar"
							anchorEl={anchorElNav}
							anchorOrigin={{
								vertical: 'bottom',
								horizontal: 'left',
							}}
							keepMounted
							transformOrigin={{
								vertical: 'top',
								horizontal: 'left',
							}}
							open={Boolean(anchorElNav)}
							onClose={handleCloseNavMenu}
							sx={{
								display: { xs: 'block', md: 'none' },
							}}
						>
							{pages.map(page => (
								<MenuItem
									key={page.name}
									onClick={async () => (await router.push(`/${page.link}`)) && handleCloseNavMenu()}
								>
									<Typography textAlign="center" sx={{ color: '#F4B400', fontWeight: 'bold' }}>
										{page.name}
									</Typography>
								</MenuItem>
							))}
						</Menu>
					</Box>
					<Image
						width={32}
						height={56}
						src="/SmileLogo.png"
						alt="Logo"
						className={style.mdLogoImage}
					/>
					<Typography
						variant="h5"
						noWrap
						component="a"
						href=""
						className={style.logoName2}
						sx={{ display: { xs: 'flex', md: 'none' } }}
					>
						Okay?
					</Typography>
					<Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
						{pages.map(page => (
							<Button
								key={page.name}
								onClick={() => router.push(`/${page.link}`)}
								sx={{
									my: 2,
									color: '#F4B400',
									display: 'block',
									fontWeight: 'bold',
								}}
							>
								{page.name}
							</Button>
						))}
					</Box>

					{user ? (
						<ButtonGroup variant="text" aria-label="buttonGroup" color="inherit">
							<Button onClick={() => router.push('/login')}>Login</Button>
							<Button onClick={() => router.push('/signup')}>Cadastro</Button>
						</ButtonGroup>
					) : (
						<Box sx={{ flexGrow: 0 }}>
							<IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
								<Avatar alt="Leonardo" src="avatar8.svg" />
							</IconButton>
							<Menu
								sx={{ mt: '45px' }}
								id="menu-appbar"
								anchorEl={anchorElUser}
								anchorOrigin={{
									vertical: 'top',
									horizontal: 'right',
								}}
								keepMounted
								transformOrigin={{
									vertical: 'top',
									horizontal: 'right',
								}}
								open={Boolean(anchorElUser)}
								onClose={handleCloseUserMenu}
							>
								{settings.map(setting => (
									<MenuItem key={setting.name} onClick={handleCloseUserMenu}>
										<Typography textAlign="center">{setting.name}</Typography>
									</MenuItem>
								))}
							</Menu>
						</Box>
					)}
				</Toolbar>
			</Container>
		</AppBar>
	);
}
