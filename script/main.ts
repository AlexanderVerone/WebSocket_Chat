const connectionStatusElement: HTMLSpanElement | null = document.querySelector('.header__connectionStatus')
const messagesListElement: HTMLUListElement | null = document.querySelector('.chat__output__messages')
const messageFormElement: HTMLFormElement | null = document.querySelector('#messageForm')
const messageInputElement: HTMLInputElement | null = document.querySelector('#messageInput')
const userNameFormElement: HTMLFormElement | null = document.querySelector('#userNameForm')
const userNameInputElement: HTMLInputElement | null = document.querySelector('#userNameInput')
const usersDivElement: HTMLDivElement | null = document.querySelector('.chat__output__users')
const usersListElement: HTMLUListElement | null = document.querySelector('.chat__output__users__list')
const headerElement: HTMLDivElement | null = document.querySelector('.header')

interface OutcomingMessage {
    type: string
    userName: string
    messageText?: string
    userTo?: User
}

interface IncomingMessage {
    messageText: string
    userName: string
    userTo?: User | null
    type: string
    activeUsers?: User[]
}

interface User {
    userId: number
    userName: string
}

let userName: string = ''
let activeUsers: User[] = []

const RESPONSE_TYPES = {
    ACTIVE_USERS: 'activeUsers',
    PRIVATE_MESSAGE: 'privateMessage',
    PUBLIC_MESSAGE: 'publicMessage'
}

function setConnectionStatus (value: string) {
    if (!connectionStatusElement) {
        return
    }

    connectionStatusElement.innerHTML = value
}

function setUserName (value: string) {
    if (!value || !userNameInputElement || !headerElement) {
        return
    }

    const userNameDOMElement = document.createElement('p')
    userNameDOMElement.classList.add('header__userName')
    userNameDOMElement.innerHTML = `Ваш ник: ${value}`
    headerElement.appendChild(userNameDOMElement)
    userName = userNameInputElement.value
}

function handleIncomingData (data: IncomingMessage) {
    if (!data) {
        return
    }

    if (data.type === RESPONSE_TYPES.ACTIVE_USERS && data.activeUsers) {
        updateUsersList(data.activeUsers)

        return
    }

    printMessage(data)
}

function updateUsersList (usersArray: User[]) {
    if (!usersListElement || !usersArray) {
        return
    }

    usersListElement.innerHTML = ''
    usersArray.forEach(user => {
        const li = document.createElement('li')
        li.innerHTML = user.userName
        usersListElement.appendChild(li)
    })
    activeUsers = [...usersArray]
}

function printMessage (message: IncomingMessage) {
    if (!messagesListElement || !message) {
        return
    }

    const li = document.createElement('li')
    li.innerHTML = `${message.userName}: ${message.messageText}`

    if (message.type === RESPONSE_TYPES.PRIVATE_MESSAGE) {
        li.innerHTML = `${message.userName} (приватно пользователю ${message.userTo?.userName}): ${message.messageText}`
        li.classList.add('privateMessage')
    }

    messagesListElement.appendChild(li)
}

function isMessagePrivate (messageText: string): boolean {
    if (!messageText) {
        return false
    }

    return messageText.includes('@') && messageText.indexOf('@') === 0
}

function isUserNameExist (userName: string): boolean {
    return activeUsers.some(user => user.userName === userName)
}

function sendMessage (messageData: OutcomingMessage) {
    if (!messageData) {
        return
    }

    ws.send(JSON.stringify(messageData))
}

const ws = new WebSocket('ws://localhost:3002')

ws.onopen = () => setConnectionStatus('ONLINE')
ws.onclose = () => setConnectionStatus('DISCONNECTED')
ws.onmessage = response => handleIncomingData(JSON.parse(response.data))

if (userNameFormElement) {
    userNameFormElement.addEventListener('submit', event => {
        event.preventDefault()

        if (!userNameInputElement || !userNameInputElement.value.trim()) {
            return
        }

        if (isUserNameExist(userNameInputElement.value)) {
            alert('Такое имя уже занято')

            return
        }

        if (
            !userNameFormElement ||
            !messageFormElement ||
            !messagesListElement ||
            !usersDivElement ||
            !messageInputElement
        ) {
            return
        }

        userNameFormElement.style.display = 'none'
        messageFormElement.style.display = 'flex'
        messagesListElement.style.display = 'block'
        usersDivElement.style.display = 'block'
        messageInputElement.focus()

        setUserName(userNameInputElement.value)

        const messageData = {
            userName: userNameInputElement.value,
            type: 'login',
        }

        sendMessage(messageData)

        userNameInputElement.value = ''
    })
}


if (messageFormElement && messageInputElement) {
    messageFormElement.addEventListener('submit', event => {
        event.preventDefault()

        if (!messageInputElement.value.trim()) {
            alert('Пустое сообщение отправлять нельзя')

            return
        }

        const messageData: OutcomingMessage = {
            type: 'publicMessage',
            userName: userName,
            messageText: messageInputElement.value,
        }

        if (isMessagePrivate(messageInputElement.value)) {
            const userTo = activeUsers.find(user => {
                return messageInputElement.value.split(' ')[0].substring(1) === user.userName
            })

            if (!userTo) {
                alert('Такой пользователь не найден')

                return
            }

            if (userTo.userName === userName) {
                alert('Себе нельзя отправлять сообщения')

                return
            }

            messageData.type = 'privateMessage'
            messageData.userTo = userTo
            messageData.messageText = messageInputElement.value.split(' ').slice(1).join(' ')

            if (!messageData.messageText.trim()) {
               alert('Пустое сообщение отправлять нельзя')

               return
            }
        }

        sendMessage(messageData)
        messageInputElement.value = ''
    })
}
