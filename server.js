import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { Server } from "socket.io"
import db, {init as initDB, getMessages, addMessage, isUserExist, addUser, getUser} from "./db.js"
import jwt from "jsonwebtoken"

import dotenv from "dotenv"
dotenv.config()

import cookie from "cookie"

initDB()

const __dirname = path.dirname(fileURLToPath(import.meta.url));



const server = createServer(async (req, res) => {
    switch (req.url) {
        case "/":
            if(guarded(req, res)) return;
            let indexHtmlFile = getStaticFile("index.html");
            res.writeHead(200, { "content-type": "text/html" });
            res.end(indexHtmlFile);
            break;
        case "/register":
            if(req.method == "GET"){
                let registerHtmlFile = getStaticFile("register.html");
                res.writeHead(200, { "content-type": "text/html" });
                res.end(registerHtmlFile);
            }
            else if(req.method == "POST"){
                let data = ""
                req.on("data", (chunk)=> data += chunk)
                req.on("end", ()=>{
                    registerUser(req, res, data)
                })
            }
            break;
        case "/login":
            if(req.method == "GET"){
                let loginHtmlFile = getStaticFile("login.html");
                res.writeHead(200, { "content-type": "text/html" });
                res.end(loginHtmlFile);
            }
            else if(req.method == "POST"){
                let data = ""
                req.on("data", (chunk)=> data += chunk)
                req.on("end", ()=>{
                    loginUser(req, res, data)
                })
            }
            break;
        case "/style.css":
            let styleCssFile = getStaticFile("style.css");
            res.writeHead(200, { "content-type": "text/css" });
            res.end(styleCssFile);
            break;
        case "/script.js":
            let scriptJsFile = getStaticFile("script.js");
            res.writeHead(200, { "content-type": "application/javascript" });
            res.end(scriptJsFile);
            break;
        case "/messages":
            let messages = await getMessages()
            res.writeHead(200, "content-type", "application/json")
            res.end(JSON.stringify(messages))
            break
        default:
            res.statusCode = 404;
            res.end("Error: Not Found");
    }
});

const io = new Server(server);

io.use((socket, next) => {
    const cookie = socket.handshake.auth.cookie
    const credentials = getCredentials(cookie)
    if(credentials == null|| credentials == "error"){
        next(new Error("no auth"))
    }
    socket.credentials = credentials
    next()
})

io.on("connection", (socket)=>{
    console.log(`User connected with id: ${socket.id}`)
    let nickname = socket.credentials.login

    socket.on("new_nickname", (data)=>{
        nickname = data
    })

    socket.on("new_message", async (data)=> {
        io.emit("message", {
            user: nickname,
            message: data
        })
        await addMessage(socket.credentials.id, data)
    })

})


server.listen(3000, () => console.log("Server on!"));

function getStaticFile(name) {
    let pathToFile = path.join(__dirname, "static", name);
    let bufferFile = readFileSync(pathToFile);
    let data = Buffer.from(bufferFile);
    return data;
}

async function registerUser(req, res, data){
    let p = JSON.parse(data)
    let login = p.login
    let password = p.password

    if(!login || !password){
        res.statusCode = 400
        res.end(JSON.stringify({error: "Empty login or password"}))
        return
    }

    if(await isUserExist(login)){
        res.statusCode = 400
        res.end(JSON.stringify({error: "User already exist"}))
        return
    }

    let result = addUser(login, password)
    if(result){
        res.statusCode = 201
        res.end(JSON.stringify({status: "ok"}))
    }else{
        res.statusCode = 500
        res.end(JSON.stringify({error: "Server error"}))
    }

}

async function loginUser(req, res, data){
    let info = JSON.parse(data)
    let login = info.login
    let password = info.password
    let user = await getUser(login, password)
    if(user == null){
        res.statusCode = 404
        res.end("user not found")
        return
    }
    if(!user){
        res.statusCode = 401
        res.end("incorrect credentials")
        return
    }
    let token = jwt.sign({id: user.id, login: user.login}, process.env.SECRET, {expiresIn: "1h"})
    res.status = 200
    res.end(token)
}

function getCredentials(c = ""){
    const cookies = cookie.parse(c)
    const token = cookies?.token
    if(!token) return null
    try{
    let user = jwt.verify(token, process.env.SECRET)
    return user
    }catch(error){
        console.log(error.message)
        return "error"
    }
}

function guarded(req, res){
    const user = getCredentials(req.headers?.cookie)
    console.log(user)
    if(user == null || user == "error"){
        res.writeHead(302, {"location": "/login"})
        res.end()
        return true
    }
}