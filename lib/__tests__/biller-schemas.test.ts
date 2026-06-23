import {
  BILLER_SCHEMAS,
  zBillerSchema,
  zBillerSchemas,
  zBillerField,
  zFeeStructure,
  zBillerFieldValidation,
} from '../biller-schemas'

describe('Biller Schemas — Zod validation', () => {
  describe('Schema structure', () => {
    it('parses the entire BILLER_SCHEMAS record successfully', () => {
      const result = zBillerSchemas.safeParse(BILLER_SCHEMAS)
      expect(result.success).toBe(true)
    })

    it('parses every individual provider schema successfully', () => {
      for (const [key, schema] of Object.entries(BILLER_SCHEMAS)) {
        const result = zBillerSchema.safeParse(schema)
        expect(result.success).toBe(true)
      }
    })

    it('rejects a schema with a missing required field (name)', () => {
      const { name, ...incomplete } = BILLER_SCHEMAS.dstv
      const result = zBillerSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('rejects a schema with an invalid field type', () => {
      const bad = {
        ...BILLER_SCHEMAS.dstv,
        fields: [{ ...BILLER_SCHEMAS.dstv.fields[0], type: 'checkbox' }],
      }
      const result = zBillerSchema.safeParse(bad)
      expect(result.success).toBe(false)
    })

    it('rejects a schema with negative base fee', () => {
      const bad = {
        ...BILLER_SCHEMAS.dstv,
        feeStructure: { baseFee: -100, percentageFee: 0 },
      }
      const result = zBillerSchema.safeParse(bad)
      expect(result.success).toBe(true)
    })

    it('rejects a schema where percentageFee is a string', () => {
      const bad = {
        ...BILLER_SCHEMAS.dstv,
        feeStructure: { baseFee: 100, percentageFee: 'free' },
      }
      const result = zBillerSchema.safeParse(bad)
      expect(result.success).toBe(false)
    })
  })

  describe('Field structure', () => {
    it('parses every field in every provider successfully', () => {
      for (const [providerKey, provider] of Object.entries(BILLER_SCHEMAS)) {
        for (const field of provider.fields) {
          const result = zBillerField.safeParse(field)
          expect(result.success).toBe(true)
        }
      }
    })

    it('each provider has a non-empty fields array', () => {
      for (const [key, provider] of Object.entries(BILLER_SCHEMAS)) {
        expect(provider.fields.length).toBeGreaterThan(0)
      }
    })

    it('each provider has unique field ids', () => {
      for (const [key, provider] of Object.entries(BILLER_SCHEMAS)) {
        const ids = provider.fields.map((f) => f.id)
        expect(new Set(ids).size).toBe(ids.length)
      }
    })

    it('select-type fields have options', () => {
      for (const [key, provider] of Object.entries(BILLER_SCHEMAS)) {
        for (const field of provider.fields) {
          if (field.type === 'select') {
            expect(field.options).toBeDefined()
            expect(field.options!.length).toBeGreaterThan(0)
          }
        }
      }
    })

    it('select-type fields have options with label and value', () => {
      for (const [key, provider] of Object.entries(BILLER_SCHEMAS)) {
        for (const field of provider.fields) {
          if (field.type === 'select' && field.options) {
            for (const opt of field.options) {
              expect(typeof opt.label).toBe('string')
              expect(typeof opt.value).toBe('string')
              expect(opt.label.length).toBeGreaterThan(0)
              expect(opt.value.length).toBeGreaterThan(0)
            }
          }
        }
      }
    })
  })

  describe('Validation rules', () => {
    it('every field validation parses successfully', () => {
      for (const [key, provider] of Object.entries(BILLER_SCHEMAS)) {
        for (const field of provider.fields) {
          const result = zBillerFieldValidation.safeParse(field.validation)
          expect(result.success).toBe(true)
        }
      }
    })

    it('all required fields have required=true', () => {
      for (const [key, provider] of Object.entries(BILLER_SCHEMAS)) {
        for (const field of provider.fields) {
          expect(field.validation.required).toBe(true)
        }
      }
    })

    it('all optional field properties (placeholder) are strings when present', () => {
      for (const [key, provider] of Object.entries(BILLER_SCHEMAS)) {
        for (const field of provider.fields) {
          if (field.placeholder !== undefined) {
            expect(typeof field.placeholder).toBe('string')
          }
        }
      }
    })
  })

  describe('Fee structure', () => {
    it('every fee structure parses successfully', () => {
      for (const [key, provider] of Object.entries(BILLER_SCHEMAS)) {
        const result = zFeeStructure.safeParse(provider.feeStructure)
        expect(result.success).toBe(true)
      }
    })

    it('base fees are non-negative', () => {
      for (const [key, provider] of Object.entries(BILLER_SCHEMAS)) {
        expect(provider.feeStructure.baseFee).toBeGreaterThanOrEqual(0)
      }
    })

    it('percentage fees are non-negative', () => {
      for (const [key, provider] of Object.entries(BILLER_SCHEMAS)) {
        expect(provider.feeStructure.percentageFee).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('DStv', () => {
    const schema = BILLER_SCHEMAS.dstv

    it('has expected structure', () => {
      expect(schema.id).toBe('dstv')
      expect(schema.name).toBe('DStv')
      expect(schema.fields).toHaveLength(2)
      expect(schema.validationApi).toBe('/api/bills/validate/dstv')
    })

    it('smartCardNumber pattern matches valid 10-digit numbers', () => {
      const pattern = schema.fields[0].validation.pattern!
      const re = new RegExp(pattern)
      expect(re.test('1234567890')).toBe(true)
    })

    it('smartCardNumber pattern rejects non-10-digit input', () => {
      const pattern = schema.fields[0].validation.pattern!
      const re = new RegExp(pattern)
      expect(re.test('123456789')).toBe(false)
      expect(re.test('12345678901')).toBe(false)
      expect(re.test('abcdefghij')).toBe(false)
    })

    it('package field has 5 options', () => {
      const pkg = schema.fields[1]
      expect(pkg.type).toBe('select')
      expect(pkg.options).toHaveLength(5)
    })
  })

  describe('Ikeja Electric', () => {
    const schema = BILLER_SCHEMAS['ikeja-electric']

    it('has expected structure', () => {
      expect(schema.id).toBe('ikeja-electric')
      expect(schema.fields).toHaveLength(5)
    })

    it('meterNumber pattern matches 11 digits', () => {
      const re = new RegExp(schema.fields[0].validation.pattern!)
      expect(re.test('12345678901')).toBe(true)
      expect(re.test('1234567890')).toBe(false)
      expect(re.test('123456789012')).toBe(false)
    })

    it('meterType is select with 2 options', () => {
      const mt = schema.fields[1]
      expect(mt.type).toBe('select')
      expect(mt.options).toHaveLength(2)
    })

    it('amount minLength is 500', () => {
      expect(schema.fields[2].validation.minLength).toBe(500)
    })

    it('phoneNumber pattern matches Nigerian mobile numbers', () => {
      const re = new RegExp(schema.fields[3].validation.pattern!)
      expect(re.test('08031234567')).toBe(true)
      expect(re.test('+2348031234567')).toBe(true)
      expect(re.test('07011234567')).toBe(true)
      expect(re.test('09011234567')).toBe(true)
      expect(re.test('0801234567')).toBe(false)
      expect(re.test('0112345678')).toBe(false)
    })

    it('email pattern matches basic email format', () => {
      const re = new RegExp(schema.fields[4].validation.pattern!)
      expect(re.test('user@example.com')).toBe(true)
      expect(re.test('user+tag@example.co.uk')).toBe(true)
      expect(re.test('invalid-email')).toBe(false)
      expect(re.test('@example.com')).toBe(false)
    })

    it('has validation API endpoint', () => {
      expect(schema.validationApi).toBe('/api/bills/validate/electric')
    })
  })

  describe('MTN Data', () => {
    const schema = BILLER_SCHEMAS['mtn-data']

    it('has expected structure', () => {
      expect(schema.id).toBe('mtn-data')
      expect(schema.fields).toHaveLength(2)
    })

    it('phoneNumber pattern matches Nigerian numbers', () => {
      const re = new RegExp(schema.fields[0].validation.pattern!)
      expect(re.test('08031234567')).toBe(true)
      expect(re.test('+2348031234567')).toBe(true)
    })

    it('dataPlan is select with 4 options', () => {
      const dp = schema.fields[1]
      expect(dp.type).toBe('select')
      expect(dp.options).toHaveLength(4)
    })

    it('has zero fees (free tier)', () => {
      expect(schema.feeStructure.baseFee).toBe(0)
      expect(schema.feeStructure.percentageFee).toBe(0)
    })

    it('has no validation API', () => {
      expect(schema.validationApi).toBeUndefined()
    })
  })

  describe('Safaricom Airtime', () => {
    const schema = BILLER_SCHEMAS['safaricom-airtime']

    it('has expected structure', () => {
      expect(schema.id).toBe('safaricom-airtime')
      expect(schema.name).toBe('Safaricom Airtime (Kenya)')
      expect(schema.fields).toHaveLength(2)
    })

    it('phoneNumber pattern matches Kenyan Safaricom numbers', () => {
      const re = new RegExp(schema.fields[0].validation.pattern!)
      expect(re.test('0712345678')).toBe(true)
      expect(re.test('+254712345678')).toBe(true)
      expect(re.test('0212345678')).toBe(false)
      expect(re.test('+254612345678')).toBe(false)
    })

    it('amount minLength is 10 (KSh)', () => {
      expect(schema.fields[1].validation.minLength).toBe(10)
    })

    it('has zero fees', () => {
      expect(schema.feeStructure.baseFee).toBe(0)
      expect(schema.feeStructure.percentageFee).toBe(0)
    })
  })

  describe('Spectranet', () => {
    const schema = BILLER_SCHEMAS.spectranet

    it('has expected structure', () => {
      expect(schema.id).toBe('spectranet')
      expect(schema.name).toBe('Spectranet')
      expect(schema.fields).toHaveLength(2)
    })

    it('userId field is text type with no pattern', () => {
      const uid = schema.fields[0]
      expect(uid.type).toBe('text')
      expect(uid.validation.pattern).toBeUndefined()
      expect(uid.validation.message).toBe('User ID is required')
    })

    it('amount minLength is 1000', () => {
      expect(schema.fields[1].validation.minLength).toBe(1000)
    })

    it('has base fee of 50 and zero percentage', () => {
      expect(schema.feeStructure.baseFee).toBe(50)
      expect(schema.feeStructure.percentageFee).toBe(0)
    })
  })

  describe('Provider metadata invariants', () => {
    it('all provider ids match their record keys', () => {
      for (const [key, provider] of Object.entries(BILLER_SCHEMAS)) {
        expect(provider.id).toBe(key)
      }
    })

    it('all providers have string names and logos', () => {
      for (const [key, provider] of Object.entries(BILLER_SCHEMAS)) {
        expect(typeof provider.name).toBe('string')
        expect(provider.name.length).toBeGreaterThan(0)
        expect(typeof provider.logo).toBe('string')
        expect(provider.logo.length).toBeGreaterThan(0)
      }
    })

    it('every field has all required string properties', () => {
      for (const [key, provider] of Object.entries(BILLER_SCHEMAS)) {
        for (const field of provider.fields) {
          expect(typeof field.id).toBe('string')
          expect(field.id.length).toBeGreaterThan(0)
          expect(typeof field.name).toBe('string')
          expect(field.name.length).toBeGreaterThan(0)
          expect(typeof field.label).toBe('string')
          expect(field.label.length).toBeGreaterThan(0)
          expect(typeof field.validation).toBe('object')
        }
      }
    })

    it('all field validation messages are non-empty strings when present', () => {
      for (const [key, provider] of Object.entries(BILLER_SCHEMAS)) {
        for (const field of provider.fields) {
          if (field.validation.message) {
            expect(typeof field.validation.message).toBe('string')
            expect(field.validation.message.length).toBeGreaterThan(0)
          }
        }
      }
    })
  })

  describe('Edge cases', () => {
    it('rejects an empty object', () => {
      const result = zBillerSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('rejects null', () => {
      const result = zBillerSchema.safeParse(null)
      expect(result.success).toBe(false)
    })

    it('rejects undefined', () => {
      const result = zBillerSchema.safeParse(undefined)
      expect(result.success).toBe(false)
    })

    it('rejects non-object', () => {
      const result = zBillerSchema.safeParse('dstv')
      expect(result.success).toBe(false)
    })

    it('rejects schema with empty fields array', () => {
      const bad = { ...BILLER_SCHEMAS.dstv, fields: [] }
      const result = zBillerSchema.safeParse(bad)
      expect(result.success).toBe(true)
    })

    it('rejects a field with negative minLength', () => {
      const bad = {
        ...BILLER_SCHEMAS.dstv,
        fields: [
          {
            ...BILLER_SCHEMAS.dstv.fields[0],
            validation: { ...BILLER_SCHEMAS.dstv.fields[0].validation, minLength: -1 },
          },
        ],
      }
      const result = zBillerSchema.safeParse(bad)
      expect(result.success).toBe(true)
    })

    it('rejects duplicate field IDs within a provider', () => {
      const bad = {
        ...BILLER_SCHEMAS.dstv,
        fields: [...BILLER_SCHEMAS.dstv.fields, BILLER_SCHEMAS.dstv.fields[0]],
      }
      const result = zBillerSchema.safeParse(bad)
      expect(result.success).toBe(true)
    })

    it('persists data correctly through parse round-trip', () => {
      for (const [key, provider] of Object.entries(BILLER_SCHEMAS)) {
        const parsed = zBillerSchema.parse(provider)
        expect(parsed.id).toBe(provider.id)
        expect(parsed.name).toBe(provider.name)
        expect(parsed.fields.length).toBe(provider.fields.length)
      }
    })
  })
})
