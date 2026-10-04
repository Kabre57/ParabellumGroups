'use client'

import Link from 'next/link'
import { Bell, Check, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNotifications, useMarkAllNotificationsAsRead, useMarkNotificationAsRead } from '@/hooks/useNotifications'

export default function NotificationsPage() {
  const { data, isLoading, isError, error, refetch } = useNotifications()
  const markAsRead = useMarkNotificationAsRead()
  const markAllAsRead = useMarkAllNotificationsAsRead()

  const notifications = data?.data || []
  const unreadCount = data?.unreadCount || 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Centralisez les alertes système et vos messages internes non lus</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
            Actualiser
          </Button>
          {unreadCount > 0 && (
            <Button
              onClick={async () => {
                try { await markAllAsRead(); await refetch() } catch { await refetch() }
              }}
            >
              <Check className="mr-2 h-4 w-4" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </div>

      {isError && <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">Impossible de charger les notifications. {error instanceof Error ? error.message : 'Vérifiez la connexion aux services.'}</div>}
      {data?.errors?.map((message) => <div key={message} role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{message}</div>)}

      <Card>
        <CardHeader>
          <CardTitle>Flux de notifications</CardTitle>
          <CardDescription>{unreadCount} notification(s) non lue(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement des notifications...
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-dashed border-red-300 py-12 text-center text-red-700">Les données sont indisponibles. Réessayez après le rétablissement du service.</div>
          ) : notifications.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
              Aucune notification disponible.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-lg border p-4 ${notification.read ? 'bg-background' : 'border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-sm text-muted-foreground">{notification.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString('fr-FR')}
                      </div>
                      {notification.link && (
                        <Link href={notification.link} className="text-sm text-blue-600 hover:underline">
                          Ouvrir
                        </Link>
                      )}
                    </div>
                    {!notification.read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try { await markAsRead(notification.id); await refetch() } catch { await refetch() }
                        }}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Marquer lu
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
