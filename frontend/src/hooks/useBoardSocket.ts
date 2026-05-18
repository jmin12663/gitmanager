import { useEffect, useRef } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { getAccessToken } from '@/api/client'

export interface BoardSocketCard {
  id: number
  title: string
  status: string
  dueDate: string | null
  assignees: Array<{ userId: number; name: string }>
  commentCount: number
}

export interface BoardSocketMessage {
  type: string
  cardId: number
  card?: BoardSocketCard
  commentCount?: number
}

export function useBoardSocket(
  projectId: number | undefined,
  onMessage: (msg: BoardSocketMessage) => void
) {
  const onMessageRef = useRef(onMessage)
  useEffect(() => {
    onMessageRef.current = onMessage
  })

  useEffect(() => {
    if (!projectId) return

    const token = getAccessToken()
    if (!token) return

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws') as WebSocket,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/projects/${projectId}/board`, frame => {
          try {
            const msg: BoardSocketMessage = JSON.parse(frame.body)
            onMessageRef.current(msg)
          } catch {}
        })
      },
    })

    client.activate()
    return () => { client.deactivate() }
  }, [projectId])
}