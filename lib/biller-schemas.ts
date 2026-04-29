export interface BillerField {
  id: string
  name: string
  label: string
  type: 'text' | 'number' | 'tel' | 'email' | 'select'
  placeholder?: string
  defaultValue?: string
  validation: {
    required?: boolean
    pattern?: string
    minLength?: number
    maxLength?: number
    message?: string
  }
  options?: { label: string; value: string }[]
  description?: string
}

export interface BillerSchema {
  id: string
  name: string
  logo: string
  fields: BillerField[]
  feeStructure: {
    baseFee: number
    percentageFee: number
  }
  validationApi?: string
}

export const BILLER_SCHEMAS: Record<string, BillerSchema> = {
  dstv: {
    id: 'dstv',
    name: 'DStv',
    logo: '📺',
    fields: [
      {
        id: 'smartCardNumber',
        name: 'smartCardNumber',
        label: 'Smartcard Number',
        type: 'number',
        placeholder: 'Enter 10-digit smartcard number',
        validation: {
          required: true,
          pattern: '^\\d{10}$',
          message: 'Smartcard number must be exactly 10 digits',
        },
      },
      {
        id: 'package',
        name: 'package',
        label: 'Select Package',
        type: 'select',
        options: [
          { label: 'DStv Premium - ₦29,500', value: 'premium' },
          { label: 'DStv Compact Plus - ₦19,800', value: 'compact_plus' },
          { label: 'DStv Compact - ₦12,500', value: 'compact' },
          { label: 'DStv Confam - ₦7,400', value: 'confam' },
          { label: 'DStv Yanga - ₦4,200', value: 'yanga' },
        ],
        validation: {
          required: true,
        },
      },
    ],
    feeStructure: {
      baseFee: 100,
      percentageFee: 0,
    },
    validationApi: '/api/bills/validate/dstv',
  },
  'ikeja-electric': {
    id: 'ikeja-electric',
    name: 'Ikeja Electric',
    logo: '⚡',
    fields: [
      {
        id: 'meterNumber',
        name: 'meterNumber',
        label: 'Meter Number',
        type: 'number',
        placeholder: 'Enter meter number',
        validation: {
          required: true,
          pattern: '^\\d{11}$',
          message: 'Meter number must be 11 digits',
        },
      },
      {
        id: 'amount',
        name: 'amount',
        label: 'Amount (₦)',
        type: 'number',
        placeholder: 'Enter amount',
        validation: {
          required: true,
          minLength: 500,
          message: 'Minimum amount is ₦500',
        },
      },
      {
        id: 'phoneNumber',
        name: 'phoneNumber',
        label: 'Phone Number',
        type: 'tel',
        placeholder: '0800 000 0000',
        validation: {
          required: true,
          pattern: '^(\\+234|0)[789][01]\\d{8}$',
          message: 'Enter a valid Nigerian phone number',
        },
      },
    ],
    feeStructure: {
      baseFee: 100,
      percentageFee: 0.01, // 1%
    },
    validationApi: '/api/bills/validate/electric',
  },
  'mtn-data': {
    id: 'mtn-data',
    name: 'MTN Data',
    logo: '📶',
    fields: [
      {
        id: 'phoneNumber',
        name: 'phoneNumber',
        label: 'Phone Number',
        type: 'tel',
        placeholder: '0803 000 0000',
        validation: {
          required: true,
          pattern: '^(\\+234|0)[789][01]\\d{8}$',
          message: 'Enter a valid MTN number',
        },
      },
      {
        id: 'dataPlan',
        name: 'dataPlan',
        label: 'Select Data Plan',
        type: 'select',
        options: [
          { label: '1GB - 1 Day - ₦300', value: '1gb_1day' },
          { label: '2.5GB - 2 Days - ₦500', value: '2.5gb_2days' },
          { label: '10GB - 30 Days - ₦3,000', value: '10gb_30days' },
          { label: '20GB - 30 Days - ₦5,000', value: '20gb_30days' },
        ],
        validation: {
          required: true,
        },
      },
    ],
    feeStructure: {
      baseFee: 0,
      percentageFee: 0,
    },
  },
  'safaricom-airtime': {
    id: 'safaricom-airtime',
    name: 'Safaricom Airtime (Kenya)',
    logo: '🇰🇪',
    fields: [
      {
        id: 'phoneNumber',
        name: 'phoneNumber',
        label: 'Phone Number',
        type: 'tel',
        placeholder: '07xx xxx xxx',
        validation: {
          required: true,
          pattern: '^(\\+254|0)(7|1)\\d{8}$',
          message: 'Enter a valid Kenyan Safaricom number',
        },
      },
      {
        id: 'amount',
        name: 'amount',
        label: 'Amount (KSh)',
        type: 'number',
        placeholder: 'Enter amount',
        validation: {
          required: true,
          minLength: 10,
          message: 'Minimum amount is 10 KSh',
        },
      },
    ],
    feeStructure: {
      baseFee: 0,
      percentageFee: 0,
    },
  },
  spectranet: {
    id: 'spectranet',
    name: 'Spectranet',
    logo: '🌐',
    fields: [
      {
        id: 'userId',
        name: 'userId',
        label: 'User ID',
        type: 'text',
        placeholder: 'Enter Spectranet User ID',
        validation: {
          required: true,
          message: 'User ID is required',
        },
      },
      {
        id: 'amount',
        name: 'amount',
        label: 'Amount (₦)',
        type: 'number',
        placeholder: 'Enter amount',
        validation: {
          required: true,
          minLength: 1000,
          message: 'Minimum amount is ₦1,000',
        },
      },
    ],
    feeStructure: {
      baseFee: 50,
      percentageFee: 0,
    },
  },
}
