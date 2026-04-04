import { createConnection } from "mysql2";

let db = createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "md_chat"
}).promise()

export async function init() {
    try {
        await db.query(`
    CREATE TABLE IF NOT EXISTS user(
    id INT PRIMARY KEY AUTO_INCREMENT,
    login VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL
    )
    `);

        await db.query(`
    CREATE TABLE IF NOT EXISTS message(
    id INT PRIMARY KEY AUTO_INCREMENT,
    author_id INT,
    content TEXT NOT NULL,
    CONSTRAINT fk_author_id FOREIGN KEY (author_id) REFERENCES user(id)
    )`);
        
    } catch (error) {
        console.log(`DB error: ${error.message}`)
    }

}

export async function getMessages(){
    let [result, fields] = await db.query("SELECT m.id, m.content, u.login as author FROM message m JOIN user u ON m.author_id = u.id")
    console.log(result)
    return result
}

getMessages()

export async function addMessage(user_id, content){
    try{
        db.query("INSERT INTO message(author_id, content) VALUES(?, ?)", [user_id, content])
    }catch(error){
        console.log(`DB error:${error.message}`)
    }
}

// addMessage(1, "How are you")

export default db