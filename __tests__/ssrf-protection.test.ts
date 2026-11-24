/**
 * Tests for SSRF protection in NEXT_API_URL validation.
 * These tests verify that private, loopback, link-local, and other dangerous
 * IP ranges are rejected by the URL validation logic.
 */

import { isIPInRange, isIPBlocked } from '../next.config.mjs'

describe('SSRF Protection - IP Range Blocking', () => {
  describe('isIPInRange', () => {
    it('blocks loopback addresses (127.x)', () => {
      expect(isIPInRange('127.0.0.1', '127.0.0.0/8')).toBe(true)
      expect(isIPInRange('127.0.0.2', '127.0.0.0/8')).toBe(true)
      expect(isIPInRange('127.255.255.255', '127.0.0.0/8')).toBe(true)
    })

    it('blocks private network 10.x', () => {
      expect(isIPInRange('10.0.0.1', '10.0.0.0/8')).toBe(true)
      expect(isIPInRange('10.10.10.10', '10.0.0.0/8')).toBe(true)
      expect(isIPInRange('10.255.255.255', '10.0.0.0/8')).toBe(true)
    })

    it('blocks private network 172.16-31.x', () => {
      expect(isIPInRange('172.16.0.1', '172.16.0.0/12')).toBe(true)
      expect(isIPInRange('172.16.50.100', '172.16.0.0/12')).toBe(true)
      expect(isIPInRange('172.31.255.255', '172.16.0.0/12')).toBe(true)
    })

    it('blocks private network 192.168.x', () => {
      expect(isIPInRange('192.168.0.1', '192.168.0.0/16')).toBe(true)
      expect(isIPInRange('192.168.100.200', '192.168.0.0/16')).toBe(true)
      expect(isIPInRange('192.168.255.255', '192.168.0.0/16')).toBe(true)
    })

    it('blocks link-local 169.254.x (including AWS metadata endpoint)', () => {
      expect(isIPInRange('169.254.169.254', '169.254.0.0/16')).toBe(true)
      expect(isIPInRange('169.254.0.1', '169.254.0.0/16')).toBe(true)
      expect(isIPInRange('169.254.255.255', '169.254.0.0/16')).toBe(true)
    }

    it('blocks unspecified addresses (0.0.0.0)', () => {
      expect(isIPInRange('0.0.0.0', '0.0.0.0/8')).toBe(true)
      expect(isIPInRange('0.1.2.3', '0.0.0.0/8')).toBe(true)
    })

    it('blocks multicast (224.x - 239.x)', () => {
      expect(isIPInRange('224.0.0.1', '224.0.0.0/4')).toBe(true)
      expect(isIPInRange('230.0.0.1', '224.0.0.0/4')).toBe(true)
      expect(isIPInRange('239.255.255.255', '224.0.0.0/4')).toBe(true)
    }

    it('blocks benchmark range (198.18.x)', () => {
      expect(isIPInRange('198.18.0.1', '198.18.0.0/15')).toBe(true)
      expect(isIPInRange('198.19.255.255', '198.18.0.0/15')).toBe(true)
    })

    it('allows public IP addresses', () => {
      expect(isIPInRange('8.8.8.8', '127.0.0.0/8')).toBe(false)
      expect(isIPInRange('1.1.1.1', '10.0.0.0/8')).toBe(false)
      expect(isIPInRange('203.0.113.1', '192.168.0.0/16')).toBe(false)
      expect(isIPInRange('54.217.123.100', '172.16.0.0/12')).toBe(false)
    })
  })

  describe('isIPBlocked', () => {
    it('returns blocked range name for 169.254.169.254 (AWS metadata)', () => {
      expect(isIPBlocked('169.254.169.254')).toBe('link-local (169.254.x)')
    })

    it('returns blocked range name for localhost', () => {
      expect(isIPBlocked('127.0.0.1')).toBe('loopback')
    })

    it('returns blocked range name for private 10.x', () => {
      expect(isIPBlocked('10.0.0.1')).toBe('private (10.x)')
      expect(isIPBlocked('10.10.10.10')).toBe('private (10.x)')
    })

    it('returns null for safe public IPs', () => {
      expect(isIPBlocked('8.8.8.8')).toBeNull()
      expect(isIPBlocked('1.1.1.1')).toBeNull()
      expect(isIPBlocked('203.0.113.1')).toBeNull()
    })
  })
})