import { RawData, WebSocket, WebSocketServer } from 'ws'

interface Rooms {
    [key: string]: WebSocket[]
}

interface User {
    userId: string
    userName: string
    userEntity?: WebSocket
}

declare module "ws" {
    class _WS extends WebSocket { }
    export interface WebSocket extends _WS {
        userId?: string
        room?: string | null
    }
}

const REQUEST_TYPES = {
    LOGIN: 'login',
    PRIVATE_MESSAGE: 'privateMessage',
    PUBLIC_MESSAGE: 'publicMessage'
}

const server = new WebSocketServer({ port: 3002, clientTracking: true });
let rooms: Rooms = {}
let users: User[] = []
const maxClients = 2

const sendActiveUsersList = () => {
    const sendData = {
        type: 'activeUsers',
        activeUsers: users,
    }

    server.clients.forEach(client => {
        client.send(JSON.stringify(sendData))
    })
}

server.on('connection', (ws, request) => {
    const userId = request.headers["sec-websocket-key"]
    ws.userId = userId
    sendActiveUsersList()

    ws.on('message', (message) => {
        if (!message) {
            return
        }

        const parsedMessage = JSON.parse(message.toString())
        const { type, userName } = parsedMessage

        if (!userId || !userName) {
            return
        }

        switch (type) {
            case REQUEST_TYPES.LOGIN:
                addNewUser(userId, userName)
                break
            case REQUEST_TYPES.PRIVATE_MESSAGE:
                handlePrivateMessage(message, ws)
                break
            case REQUEST_TYPES.PUBLIC_MESSAGE:
                handlePublicMessage(message)
                break
            default:
                console.warn(`Unknown provided type: ${type}`)
                break
        }
    })

    ws.on('close', () => {
        if (!userId) {
            console.warn(`Failed to leave the room, incorrect userId`)

            return
        }

        leaveRoom()
        users = deleteUserFromArray(users, userId)

        sendActiveUsersList()
    })

    const addNewUser = (userId: string, userName: string) => {
        if (!userId || !userName) {
            return
        }

        const newUser = {
            userId,
            userName,
        }

        users.push(newUser)

        sendActiveUsersList()
    }

    const handlePrivateMessage = (message: RawData, currentUserEntity: WebSocket) => {
        const currentRoom = createRoom(currentUserEntity)

        const { userTo } = JSON.parse(message.toString())
        server.clients.forEach(client => {
            if (client.userId && client.userId === userTo.userId) {
                userTo.userEntity = client
                joinRoom(currentRoom, userTo)
            }
        })

        rooms[currentRoom].forEach(privateClient => privateClient.send(message.toString()))
    }

    const handlePublicMessage = (messageData: RawData) => {
        server.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageData.toString())
            } else {
                client.send(JSON.stringify(client))
            }
        })
    }

    const deleteUserFromArray = (usersArray: User[], userId: string): User[] => {
        return usersArray.filter(user => user.userId !== userId)
    }

    const createRoom = (currentUser: WebSocket): string => {
        const roomIdentifier = generateRoomKey(5)
        rooms[roomIdentifier] = [currentUser]
        currentUser['room'] = roomIdentifier

        return roomIdentifier
    }

    const joinRoom = (roomIdentifier: string, userTo: User) => {
        if (!userTo || !userTo.userEntity) {
            console.warn(`Failed to join user ${userTo.userName} to private room`)

            return
        }

        if (!Object.keys(rooms).includes(roomIdentifier)) {
            console.warn(`Room ${roomIdentifier} does not exist!`)

            return
        }

        if (rooms[roomIdentifier].length >= maxClients) {
            console.warn(`Room ${roomIdentifier} is full!`)

            return
        }

        rooms[roomIdentifier].push(userTo.userEntity)

        server.clients.forEach(client => {
            if (client.userId && client.userId === userTo.userId) {
                client.room = roomIdentifier
            }
        })
    }

    const generateRoomKey = (keyLength: number): string => {
        let result = ''
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

        for (let i = 0; i < keyLength; i++) {
            result +=characters.charAt(
                Math.floor(Math.random() * characters.length)
            )
        }

        return result
    }

    const leaveRoom = () => {
        const room = ws.room
        if (!room || !rooms[room]) {
            return
        }

        rooms[room] = rooms[room].filter(roomUser => roomUser !== ws)
        ws["room"] = null

        if (rooms[room].length === 0) {
            closeRoom(room)
        }
    }

    const closeRoom = (roomIdentifier: string) => {
        delete rooms[roomIdentifier]
    }
})
