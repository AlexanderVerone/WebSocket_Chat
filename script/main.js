"use strict";
const connectionStatusElement = document.querySelector('.header__connectionStatus');
const messagesListElement = document.querySelector('.chat__output__messages');
const messageFormElement = document.querySelector('#messageForm');
const messageInputElement = document.querySelector('#messageInput');
const userNameFormElement = document.querySelector('#userNameForm');
const userNameInputElement = document.querySelector('#userNameInput');
const usersDivElement = document.querySelector('.chat__output__users');
const usersListElement = document.querySelector('.chat__output__users__list');
const headerElement = document.querySelector('.header');
let userName = '';
let activeUsers = [];
const RESPONSE_TYPES = {
    ACTIVE_USERS: 'activeUsers',
    PRIVATE_MESSAGE: 'privateMessage',
    PUBLIC_MESSAGE: 'publicMessage'
};
function setConnectionStatus(value) {
    if (!connectionStatusElement) {
        return;
    }
    connectionStatusElement.innerHTML = value;
}
function setUserName(value) {
    if (!value || !userNameInputElement || !headerElement) {
        return;
    }
    const userNameDOMElement = document.createElement('p');
    userNameDOMElement.classList.add('header__userName');
    userNameDOMElement.innerHTML = `Ваш ник: ${value}`;
    headerElement.appendChild(userNameDOMElement);
    userName = userNameInputElement.value;
}
function handleIncomingData(data) {
    if (!data) {
        return;
    }
    if (data.type === RESPONSE_TYPES.ACTIVE_USERS && data.activeUsers) {
        updateUsersList(data.activeUsers);
        return;
    }
    if (data) {
        printMessage(data);
    }
}
function updateUsersList(usersArray) {
    if (!usersListElement || !usersArray) {
        return;
    }
    usersListElement.innerHTML = '';
    usersArray.forEach(user => {
        const li = document.createElement('li');
        li.innerHTML = user.userName;
        usersListElement.appendChild(li);
    });
    activeUsers = [...usersArray];
}
function printMessage(message) {
    var _a;
    if (!messagesListElement || !message) {
        return;
    }
    const li = document.createElement('li');
    li.innerHTML = `${message.userName}: ${message.messageText}`;
    if (message.type === RESPONSE_TYPES.PRIVATE_MESSAGE) {
        li.innerHTML = `${message.userName} (приватно пользователю ${(_a = message.userTo) === null || _a === void 0 ? void 0 : _a.userName}): ${message.messageText}`;
        li.classList.add('privateMessage');
    }
    messagesListElement.appendChild(li);
}
function isMessagePrivate(messageText) {
    if (!messageText) {
        return false;
    }
    return messageText.includes('@') && messageText.indexOf('@') === 0;
}
function isUserNameExist(userName) {
    return activeUsers.some(user => user.userName === userName);
}
function sendMessage(messageData) {
    if (!messageData) {
        return;
    }
    ws.send(JSON.stringify(messageData));
}
const ws = new WebSocket('ws://localhost:3002');
ws.onopen = () => setConnectionStatus('ONLINE');
ws.onclose = () => setConnectionStatus('DISCONNECTED');
ws.onmessage = response => handleIncomingData(JSON.parse(response.data));
if (userNameFormElement) {
    userNameFormElement.addEventListener('submit', event => {
        event.preventDefault();
        if (!userNameInputElement || !userNameInputElement.value.trim()) {
            return;
        }
        if (isUserNameExist(userNameInputElement.value)) {
            alert('Такое имя уже занято');
            return;
        }
        if (!userNameFormElement ||
            !messageFormElement ||
            !messagesListElement ||
            !usersDivElement ||
            !messageInputElement) {
            return;
        }
        userNameFormElement.style.display = 'none';
        messageFormElement.style.display = 'flex';
        messagesListElement.style.display = 'block';
        usersDivElement.style.display = 'block';
        messageInputElement.focus();
        setUserName(userNameInputElement.value);
        const messageData = {
            userName: userNameInputElement.value,
            type: 'login',
        };
        sendMessage(messageData);
        userNameInputElement.value = '';
    });
}
if (messageFormElement && messageInputElement) {
    messageFormElement.addEventListener('submit', event => {
        event.preventDefault();
        if (!messageInputElement.value.trim()) {
            alert('Пустое сообщение отправлять нельзя');
            return;
        }
        const messageData = {
            type: 'publicMessage',
            userName: userName,
            messageText: messageInputElement.value,
        };
        if (isMessagePrivate(messageInputElement.value)) {
            const userTo = activeUsers.find(user => {
                return messageInputElement.value.split(' ')[0].substring(1) === user.userName;
            });
            if (!userTo) {
                alert('Такой пользователь не найден');
                return;
            }
            if (userTo.userName === userName) {
                alert('Себе нельзя отправлять сообщения');
                return;
            }
            messageData.type = 'privateMessage';
            messageData.userTo = userTo;
            messageData.messageText = messageInputElement.value.split(' ').slice(1).join(' ');
            if (!messageData.messageText.trim()) {
                alert('Пустое сообщение отправлять нельзя');
                return;
            }
        }
        sendMessage(messageData);
        messageInputElement.value = '';
    });
}
