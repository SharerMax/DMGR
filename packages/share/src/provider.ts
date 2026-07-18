export interface ProviderField {
  key: string
  label: string
  type: 'text' | 'password' | 'url'
  required: boolean
  placeholder?: string
  description?: string
}

export interface ProviderFeatures {
  domainSync: boolean
  dnsManagement: boolean
  autoRenew: boolean
}
