import { TextDecoder, TextEncoder } from 'util'
import { Blob, File } from 'buffer'
import { ReadableStream, TransformStream, WritableStream } from 'stream/web'
import { MessageChannel, MessagePort, BroadcastChannel } from 'worker_threads'
import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

// Set TextEncoder/Decoder and Streams/Message globals first because undici needs them on load
global.TextDecoder = TextDecoder as typeof global.TextDecoder
global.TextEncoder = TextEncoder
globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder
globalThis.TextEncoder = TextEncoder

global.ReadableStream = ReadableStream as typeof global.ReadableStream
global.TransformStream = TransformStream as typeof global.TransformStream
global.WritableStream = WritableStream as typeof global.WritableStream
globalThis.ReadableStream = ReadableStream as typeof globalThis.ReadableStream
globalThis.TransformStream = TransformStream as typeof globalThis.TransformStream
globalThis.WritableStream = WritableStream as typeof globalThis.WritableStream

global.MessageChannel = MessageChannel as typeof global.MessageChannel
global.MessagePort = MessagePort as typeof global.MessagePort
globalThis.MessageChannel = MessageChannel as typeof globalThis.MessageChannel
globalThis.MessagePort = MessagePort as typeof globalThis.MessagePort

global.BroadcastChannel = BroadcastChannel as typeof global.BroadcastChannel
globalThis.BroadcastChannel = BroadcastChannel as typeof globalThis.BroadcastChannel

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
