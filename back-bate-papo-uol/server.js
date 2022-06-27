import express from "express";
import cors from 'cors';
import { MongoClient, ObjectId } from "mongodb";
import dotenv from 'dotenv';
import dayjs from "dayjs";
import joi from "joi";

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

const userSchema = joi.object({
    name: joi.string().required(),
    lastStatus: [
        joi.string(),
        joi.number()
    ]
  });

const messageSchema = joi.object({
    to: joi.string().min(1).required(),
    text: joi.string().min(1).required(),
    type: joi.string().valid('message','private_message').required(),
    from: joi.string().min(1).required(),
    time: [
        joi.string(),
        joi.number()
    ]
  });

setInterval(removeParticipant, 15000)

server.post('/participants', async (request, response) => {

const user = request.body;
user.lastStatus = Date.now();
let time = `${dayjs().format('HH')}:${dayjs().format('mm')}:${dayjs().format('ss')}`;

const validation = userSchema.validate(user);

if (validation.error) {
    console.log(validation.error.details)
  return response.status(422).send("Nome de usuário é obrigatório")  
}

try { 
    const loggedUser = await db.collection("users").findOne({ name: user.name })
    if (loggedUser) {return response.status(409).send("Nome de usuário já está sendo utilizado")}

    await
db.collection("users").insertOne(user);
response.status(201).send("OK")
db.collection("messages").insertOne({from: `${user.name}`, to: 'Todos', text: 'entra na sala...', type: 'status', time: `${time}`})
}

catch (error) {response.status(500)}

});


server.get('/participants', async (request, response) => {

    const users = await db.collection("users").find().toArray();
    
    response.send(users);
})

server.post('/messages', async (request, response) => {
  let msg = request.body;
  const { user } = request.headers;
  let time = `${dayjs().format('HH')}:${dayjs().format('mm')}:${dayjs().format('ss')}`;
  
  const fromValidation = await db.collection("users").findOne({name: user})  
  if (!fromValidation) {return response.status(422).send("Usuário não está logado")}

  let newMessage = {from: `${user}`, to: `${msg.to}`, text: `${msg.text}`, type: `${msg.type}`, time: `${time}`}

  const validation = messageSchema.validate(newMessage);

if (validation.error) {
    console.log(validation.error.details)
  return response.status(422).send("Algo está errado")  
}

try { await db.collection("messages").insertOne(newMessage) 
response.sendStatus(201)
}
catch (error) {response.status(500)}
})

server.get('/messages', async (request, response) => {

    const limit = parseInt(request.query.limit);
    const { user } = request.headers;

    const messages = await db.collection("messages").find().toArray();
    const messageList = messages.filter((message) => {
        if (message.to === "Todos" || message.to === `${user}` || message.from === `${user}`) {return true}
        else if (message.type === "message" || message.type === "status") {return true}
        else {return false}
    });
    const messageLimited = messageList.slice(-limit);
    
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

async function removeParticipant() {
    let now = Date.now();    
    const users = await db.collection("users").find().toArray();
    let time = `${dayjs().format('HH')}:${dayjs().format('mm')}:${dayjs().format('ss')}`;

    for (let user of users) {
        if (now - user.lastStatus > 10000) {
            db.collection("users").deleteOne( { name: user.name } )
            db.collection("messages").insertOne({from: `${user.name}`, to: 'Todos', text: 'sai na sala...', type: 'status', time: `${time}`})
        }
    }
}

server.delete(`/messages/:id`, async (request, response) => {
    const { user } = request.headers;
    const id = request.params;
    const message = await db.collection("messages").findOne({_id: new ObjectId(id)});
    if (!message) {return response.status(404).send("Não encontrado")};
    const verifyUser = await db.collection("messages").find( {$and: [{_id: new ObjectId(id)}, {from: `${user}`}]} );
    if (!verifyUser) {return response.status(401).send("Não autorizado")};
    await db.collection("messages").deleteOne( { _id: new ObjectId(id)} )
    response.status(200)
})


server.listen(5000)