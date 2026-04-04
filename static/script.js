const socket = io()

let form = document.querySelector("#form")

form.addEventListener("submit", (event)=>{
    event.preventDefault()
    let message = event.target["input"].value
    console.log(message)
    if (message){
        socket.emit("new_message", message)
        event.target.reset()
    }
})

socket.on("message", (data)=>{
    console.log("From server: ", data)
    addMessage(data)
})

function addMessage(message){
    let messageList = document.querySelector(".messages")
    let messageItem = document.createElement("li")
    messageItem.textContent = `${message.user}: ${message.message}`
    messageList.appendChild(messageItem)
    window.scrollTo(0, messageList.scrollHeight)
}

document.querySelector(".auth").addEventListener("click", ()=>{
    let nickname = prompt("Введи своє ім'я", "Анон")
    if(nickname) socket.emit("new-nickname", nickname)
})

function getMessages(){
    fetch('/messages').then(res=>res.json()).then(data=>{
        console.log(data)
        data.forEach(message => addMessage({user:message.author, message: message.content}))
    })
}

getMessages()