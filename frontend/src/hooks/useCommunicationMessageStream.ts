import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'

/** Actualise les vues concernées dès qu'un message du compte est modifié. */
export function useCommunicationMessageStream(enabled = true) {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!enabled || !isAuthenticated || typeof window === 'undefined') return
    const token = localStorage.getItem('accessToken')
    if (!token) return
    const source = new EventSource(`/api/communication/messages/stream?token=${encodeURIComponent(token)}`)
    source.onmessage = (event) => {
      try {
        if (JSON.parse(event.data)?.type === 'MESSAGE') {
          queryClient.invalidateQueries({ queryKey: ['communication-messages'] }).catch(() => {})
          queryClient.invalidateQueries({ queryKey: ['notifications'] }).catch(() => {})
        }
      } catch { /* Ignore les événements incomplets. */ }
    }
    return () => source.close()
  }, [enabled, isAuthenticated, queryClient])
}
