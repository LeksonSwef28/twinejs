import * as React from 'react';
import {
	PreviewFromHereFocus,
	PreviewFromHereRequest
} from '../../../application/narrative/preview-from-here';

export interface PreviewFromHereSessionValue {
	request?: PreviewFromHereRequest;
	requestPreviewFromHere(focus: PreviewFromHereFocus): void;
}

const defaultSession: PreviewFromHereSessionValue = {
	request: undefined,
	requestPreviewFromHere: () => undefined
};

export const PreviewFromHereSessionContext =
	React.createContext<PreviewFromHereSessionValue>(defaultSession);

export function usePreviewFromHereSession() {
	return React.useContext(PreviewFromHereSessionContext);
}
