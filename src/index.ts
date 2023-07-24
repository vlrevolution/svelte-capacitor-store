import { writable, type Writable } from 'svelte/store';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

interface StoreOptions<T> {
	storeName: string;
	initialValue: T;
	initFunction?: () => void;
}

// Define a new interface that extends Writable and includes reset
interface ResettableWritable<T> extends Writable<T> {
	reset: () => void;
}

const isDeviceNative = Capacitor.isNativePlatform();

async function getStoredValue(key: string): Promise<any | null> {
	if (isDeviceNative) {
		const { value } = await Preferences.get({ key });
		return value ? JSON.parse(value) : null;
	} else {
		return JSON.parse(localStorage.getItem(key) || 'null');
	}
}

async function setStoredValue(key: string, value: any) {
	if (isDeviceNative) {
		await Preferences.set({ key, value: JSON.stringify(value) });
	} else {
		localStorage.setItem(key, JSON.stringify(value));
	}
}

export function createPersistedStore<T>({
	storeName,
	initialValue,
	initFunction
}: StoreOptions<T>): { store: ResettableWritable<T | null>; loading: Writable<boolean> } {
	const { subscribe, set, update } = writable<T | null>(null);
	const loading = writable(true);

	// This is called every time the store is updated
	subscribe(async (value) => {
		if (value !== null) {
			await setStoredValue(storeName, value);
		}
	});

	// Load the persisted value in the background, after the store is created
	// This will automatically update all subscribers with the loaded value
	getStoredValue(storeName).then((storedValue) => {
		if (storedValue !== null) {
			set(storedValue);
		} else {
			set(initialValue);
		}

		if (initFunction) {
			initFunction();
		}

		loading.set(false);
	});

	return {
		store: {
			subscribe,
			set,
			update,
			reset: () => {
				set(initialValue);
				setStoredValue(storeName, initialValue);
			}
		},
		loading
	};
}

