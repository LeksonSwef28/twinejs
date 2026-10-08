import {app, BrowserWindow, dialog, screen, shell} from 'electron';
import path from 'path';
import {fileURLToPath} from 'url';
import {qaProductName} from './qa-profile';
import {initIpc} from './ipc';
import {initLocales} from './locales';
import {initMenuBar} from './menu-bar';
import {cleanScratchDirectory} from './scratch-file';
import {
	backupStoryDirectory,
	createStoryDirectory,
	initStoryDirectory
} from './story-directory';
import {getUserCss} from './user-css';

let mainWindow: BrowserWindow | null;

async function createWindow() {
	const screenSize = screen.getPrimaryDisplay().workAreaSize;

	mainWindow = new BrowserWindow({
		height: Math.round(screenSize.height * 0.9),
		width: Math.round(screenSize.width * 0.9),
		show: false,
		webPreferences: {
			preload: path.resolve(__dirname, './preload.js'),
			sandbox: true
		}
	});
	mainWindow.loadURL(
		// Path is relative to this file in the electron-build/ directory that's
		// created during `npm run build:electron-main`.
		// app.isPackaged
		`file://${path.resolve(__dirname, '../../../../renderer/index.html')}`
	);

	mainWindow.once('ready-to-show', async () => {
		const userCss = await getUserCss();

		if (userCss) {
			console.log('Adding user CSS');
			mainWindow!.webContents.insertCSS(userCss);
		}

		mainWindow!.show();

		if (!app.isPackaged) {
			mainWindow!.webContents.openDevTools();
		}
	});
	mainWindow.on('closed', () => (mainWindow = null));

	// Load external links in the system browser.

	mainWindow.webContents.on('will-navigate', (event, url) => {
		shell.openExternal(url);
		event.preventDefault();
	});
	mainWindow.webContents.setWindowOpenHandler(({url}) => {
		// QA production Player uses the same origin/profile as the editor for
		// one-time artifact handoff. Never allow arbitrary file or web windows.
		if (app.isPackaged && app.getName() === qaProductName) {
			try {
				const target = new URL(url);
				const expected = path.resolve(
					__dirname,
					'../../../../renderer/player.html'
				);
				if (
					target.protocol === 'file:' &&
					target.hash === '#handoff=development' &&
					fileURLToPath(target) === expected
				) {
					return {
						action: 'allow',
						overrideBrowserWindowOptions: {
							width: 1100,
							height: 800,
							webPreferences: {sandbox: true}
						}
					};
				}
			} catch {
				// Unknown targets retain the ordinary external-link policy.
			}
		}
		shell.openExternal(url);
		return {action: 'deny'};
	});
}

export async function initApp() {
	try {
		await initLocales();
		await initStoryDirectory();
		await createStoryDirectory();
		await backupStoryDirectory();
		setInterval(backupStoryDirectory, 1000 * 60 * 20);
		initIpc();
		initMenuBar();
		app.on('will-quit', async () => {
			await cleanScratchDirectory();
		});
		createWindow();
	} catch (error) {
		// Not localized because that may be the cause of the error.

		dialog.showErrorBox(
			'An error occurred during startup.',
			(error as Error).message
		);
		app.quit();
	}
}
