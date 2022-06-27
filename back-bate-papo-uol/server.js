import express from "express";
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
import dayjs from "dayjs";
import Joi from "joi";

const server = express();

dotenv.config();

server.use(
    express.urlencoded({
        extended: true,
    })
);

server.use(express.json())
server.use(cors())

server.use(function (request, response, next) {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', '*');
    response.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

const mongoClient = new MongoClient(process.env.MY_URL_MONGO);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("bate-papo-uol");
});


server.post('/participants', async (request, response) => {

const user = request.body;
user.lastStatus = Date.now();
let time = `${dayjs().format('HH')}:${dayjs().format('mm')}:${dayjs().format('ss')}`;


if (user.name === "") {return response.status(422).send("Campo nome não pode ser vazio")}
else { try { await
db.collection("users").insertOne(user);
response.status(201).send("OK")
db.collection("messages").insertOne({from: `${user.name}`, to: 'Todos', text: 'entra na sala...', type: 'status', time: `${time}`})
}
catch (error) {response.status(500)}}

});


server.get('/participants', async (request, response) => {

    const users = await db.collection("users").find().toArray();
    
    response.send(users);
})

server.post('/messages', (request, response) => {
  let msg = request.body;
  const { user } = request.headers;
  let time = `${dayjs().format('HH')}:${dayjs().format('mm')}:${dayjs().format('ss')}`;
  
  db.collection("messages").insertOne({from: `${user}`, to: `${msg.to}`, text: `${msg.text}`, type: `${msg.type}`, time: `${time}`}).then(() => response.sendStatus(201))
})

server.get('/messages', async (request, response) => {

    const limit = parseInt(request.query.limit);

    const messageList = await db.collection("messages").find().toArray();
    const messageLimited = messageList.slice(-limit)
    
    if (limit) {
        return response.send(messageLimited)}

    response.send(messageList)

})

server.post('/status', async (request, response) => {

    const { user } = request.headers;

    try {
		const userStatus = await db.collection("users").findOne({ name: user })
		if (!userStatus) {
			response.sendStatus(404)
			return;
		}


		await db.collection("users").updateOne({ 
			name: user
		}, { $set: {lastStatus: Date.now()}})
				
		response.sendStatus(200)
        
	 } catch (error) {
	  response.status(500).send(error)
	 }

})

// function removeParticipant {
//     let now = Date.now();
//     for 
//     if (parseInt(now) - parseInt(user.lastStatus) > 10) {

//     }
// }



server.listen(5000)