import { TextDecoder, TextEncoder } from 'util'
import { Blob, File } from 'buffer'
import { ReadableStream, TransformStream, WritableStream } from 'stream/web'
import { MessageChannel, MessagePort, BroadcastChannel } from 'worker_threads'
import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

// Set TextEncoder/Decoder and Streams/Message globals first because undici needs them on load
// Jest 30 already provides many of these globals in jsdom; only fill in what's missing to avoid
	// overwriting native implementations that undici may depend on.
const setGlobalIf = (name: string, value: unknown) => {
	if (typeof (globalThis as any)[name] === 'undefined') {
		Object.defineProperty(globalThis, name, {
			value,
			writable: true,
			enumerable: true,
			configurable: true,
		})
	}
}

setGlobalIf('TextDecoder', TextDecoder)
setGlobalIf('TextEncoder', TextEncoder)
setGlobalIf('ReadableStream', ReadableStream)
setGlobalIf('TransformStream', TransformStream)
setGlobalIf('WritableStream', WritableStream)
setGlobalIf('MessageChannel', MessageChannel)
setGlobalIf('MessagePort', MessagePort)
setGlobalIf('BroadcastChannel', BroadcastChannel)

// Now load undici after globals are set
// eslint-disable-next-line @typescript-eslint/no-require-imports -- a static import would hoist above the globals this module reads at load time
const { fetch, Headers, FormData, Request, Response } = require('undici')

const polyfills = {
	TextDecoder: { value: TextDecoder, writable: true, enumerable: true, configurable: true },
	TextEncoder: { value: TextEncoder, writable: true, enumerable: true, configurable: true },
	Blob: { value: Blob, writable: true, enumerable: true, configurable: true },
	File: { value: File, writable: true, enumerable: true, configurable: true },
	fetch: { value: fetch, writable: true, enumerable: true, configurable: true },
	Headers: { value: Headers, writable: true, enumerable: true, configurable: true },
	FormData: { value: FormData, writable: true, enumerable: true, configurable: true },
	Request: { value: Request, writable: true, enumerable: true, configurable: true },
	Response: { value: Response, writable: true, enumerable: true, configurable: true },
	Event: { value: globalThis.Event, writable: true, enumerable: true, configurable: true },
	EventTarget: {
		value: globalThis.EventTarget,
		writable: true,
		enumerable: true,
		configurable: true,
	},
	ReadableStream: { value: ReadableStream, writable: true, enumerable: true, configurable: true },
	TransformStream: { value: TransformStream, writable: true, enumerable: true, configurable: true },
	WritableStream: { value: WritableStream, writable: true, enumerable: true, configurable: true },
	BroadcastChannel: {
		value: BroadcastChannel,
		writable: true,
		enumerable: true,
		configurable: true,
	},
}

Object.defineProperties(global, polyfills)
Object.defineProperties(globalThis, polyfills)

// jsdom has no matchMedia; hooks/use-media-query.ts needs it. Default to "no match".
if (typeof window !== 'undefined' && !window.matchMedia) {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
		}),
	})
}

// Tests must not hit the network. undici's real fetch also crashes under jsdom
// (removeAbortListener/markResourceTiming), so the default fetch rejects like an
// offline request; tests that need responses install their own mock.
const unmockedFetch = () => Promise.reject(new TypeError('Network request not mocked in this test'))
Object.defineProperty(globalThis, 'fetch', {
	value: unmockedFetch,
	writable: true,
	enumerable: true,
	configurable: true,
})
