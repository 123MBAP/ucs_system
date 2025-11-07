import React from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider } from 'src/lib/i18n';
import App from './App';
import './src/index.css';

const container = document.getElementById('root');
if (container) {
	const root = createRoot(container);
	root.render(
			<React.StrictMode>
				<LanguageProvider>
					<App />
				</LanguageProvider>
			</React.StrictMode>
	);
}
