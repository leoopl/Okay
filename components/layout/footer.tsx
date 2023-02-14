import { Divider, Link } from '@mui/material';
import style from './navBar.module.css';
import GitHubIcon from '@mui/icons-material/GitHub';

export default function Footer() {
	return (
		<>
			<Divider variant="middle" sx={{ bgcolor: '#000000' }} />
			<div className={style.footerDiv}>
				<div>
					<span>&copy; 2023 Okay?. All rights reserved to Leonardo P. Leite.</span>
				</div>
				<Divider orientation="vertical" flexItem sx={{ bgcolor: '#000000' }} />
				<div className={style.linkDiv}>
					<Link href="https://github.com/leoopl/Okay" underline="none" target="_blank" color="#FFF">
						<GitHubIcon />
					</Link>
				</div>
			</div>
		</>
	);
}
