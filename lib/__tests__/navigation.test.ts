import { redirectTo } from '../navigation'

describe('redirectTo', () => {
  it('assigns the URL to window.location.href', () => {
    // jsdom can't observe or perform cross-document navigation; it reports the
    // attempt as "not implemented". Capture that to confirm the assignment ran.
    const errors: string[] = []
    const spy = jest.spyOn(console, 'error').mockImplementation((message: unknown) => {
      errors.push(String(message))
    })

    redirectTo('https://pay.ozow.com/initiate?token=abc')

    expect(errors.some((message) => /navigation/i.test(message))).toBe(true)
    spy.mockRestore()
  })

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://pay.ozow.com/initiate',
    'https://user:pass@evil.example/',
    '//evil.example/path',
    '/relative/path',
    'not a url',
    '',
  ])('throws and does not navigate for %p', (unsafe) => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => redirectTo(unsafe)).toThrow(/redirectTo/)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
