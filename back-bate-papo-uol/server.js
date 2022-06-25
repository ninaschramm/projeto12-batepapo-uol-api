import express from "express";
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
import dayjs from "dayjs";

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


server.post('/participants', (request, response) => {

const user = request.body;
user.lastStatus = Date.now()
let time = `${dayjs().format('HH')}:${dayjs().format('mm')}:${dayjs().format('ss')}}`;


if (user.name === "") {return response.status(422).send("Campo nome não pode ser vazio")}
else {
db.collection("users").insertOne(user).then(() => response.status(201).send("OK"))
db.collection("messages").insertOne({from: `${user.name}`, to: 'Todos', text: 'entra na sala...', type: 'status', time: `${time}`})
}

});



server.post('/tweets', (request, response) => {
  let tweet = request.body;
  
  db.collection("tweets").insertOne(tweet).then(() => response.send("OK"))
})

server.get('/messages', (request, response) => {

    const limit = parseInt(request.query.limit);

db.collection("messages").find().toArray().then(msg => response.send(msg))

})



server.listen(5000)