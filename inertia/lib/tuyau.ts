import { createTuyau } from '@tuyau/client'

const baseUrl = typeof window === 'undefined' ? '' : window.location.origin

export const tuyau = createTuyau({ baseUrl })
