import express, { json } from "express";
import cors from "cors";
import chalk from 'chalk';
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import joi from 'joi';
import dayjs from 'dayjs';

const app = express();
app.use(cors());
app.use(json());

dotenv.config();

//Validações

const participantsSchema = joi.object({
    name: joi.string().required()
});

const messagesSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.valid('message', 'private_message').required()
});

//Acesso ao mongo

let db = null; 
const client = new MongoClient(process.env.URL_CONNECT_MONGO);

//Acesso ao banco de dados test
client.connect().then(() => {
    db = client.db("uol"); 
    console.log(chalk.blue.bold("Banco de dados conectado com sucesso"));
}).catch((error) => {
    console.log(chalk.red.bold("Falha na conexão com o banco de dados"), err)
});



// Participants 

app.post("/participants", async (req, res) => {
    
    //Recebe o nome do usuário no body da requisição
    const participants = req.body;
    //Validações 
    const validation = participantsSchema.validate(participants, { abortEarly: false})
    const isRegistered = await db.collection("participants").findOne({name : participants.name});

    if(validation.error){
        console.log(validation.error.details);
        res.status(422).send("O nome não foi validado");
        return;
    }
    if(isRegistered){
     res.status(409).send("Esse nome já existe! Por favor escolha outro.");
     return;
    }
    try {
       await db.collection("participants").insertOne({
           name: participants.name,
           lastStatus: Date.now()
        });
        res.status(201).send("Usuário inserido com sucesso!");

    } catch (error) {
        res.status(500);
        client.close();
    }   
});


app.get("/participants", async (req, res) => {
    try {
        const participantsList = await db.collection("participants").find().toArray();
        res.send(participantsList);
    } catch (error) {
        res.status(500).send("Erro ao pegar dados dos usuários.");
    }
});


//Mensages 
app.post("/messages", async (req, res) => {
    const body = req.body;
    const user = req.headers;

    //Valida o nome de acordo com o que foi definido em messagesSchema. Ser string e não vazio
    const validation = messagesSchema.validate(body, { abortEarly: false});
    if(validation.error){
        res.status(422).send(validation.error.details);
        return;
    }

    const online = await db.collection("participants").findOne({name: user.user});
    if(!online){
        res.status(422);
        return;
    }
   
    try {
        await db.collection("messages").insertOne({
            from: user.user,
            to: body.to,
            text: body.text,
            type: body.type,
            time: dayjs().format("HH:mm:ss")
        });
        
        res.status(201).send("Mensagem enviada com sucesso!");
       
     } catch (error) {
         console.log(error);
         res.status(500).send("Ocorreu um erro ao enviar as mensagens!");
        
     }   
 });


 app.get("/messages", async (req, res) => {
     const user = req.header;
     const limit = parseInt(req.query.limit);

     if(limit === undefined){
        res.status(200).send(messagesList);
    }

    try {
        const messagesList = await db.collection("messages").find({
            $or: [{from: user.user},
                {to: user.user},
                {to: "Todos"}]
        }).toArray();

        res.status(200).send(messagesList.slice(messagesList.length - limit, messagesList.length));
       
    } catch (error) {
        console.log(error);
        res.status(500).send("Ocorreu um erro ao coletar as mensagens.");
       
    }
});


//Status

app.post("/status", async (req, res) => {
    const user = req.headers;

    const participants = await db.collection("participants").find({}).toArray();

    const online = participants.find((participant) => 
    participant.name === user.user);

    if(online === false){
        res.status(404);
        return;
    }
    try {
        await db.collection("participants").updateOne(
            { _id: new ObjectId(online._id) },
            { $set: { lastStatus: Date.now() } }
            );

        res.status(200).send("Status atualizado!");
       
     } catch (error) {
         console.log(error);
         res.status(500).send("Ocorreu um erro ao postar os status!");
     }   
 });


 function removerInativos() {
    const promise = db.collection("participantes").find({}).toArray();

    promise.then(participantes => {
        participantes.forEach(async p => {
            if (Date.now() - p.lastStatus > 10) {
               
                let now = dayjs();
                now = now.format('HH:mm:ss');

                const novaMensagem = {
                    from: p.name,
                    to: 'Todos',
                    text: 'sai da sala...',
                    type: 'status',
                    time: now
                };

                try {
                    await db.collection("participants").deleteOne({ _id: p._id });
                    await db.collection("messages").insertOne(novaMensagem);
                } catch (err) {
                    console.log(err);
                }
            }
        });
    });
}

setInterval(removerInativos, 15000);

//Servidor 
app.listen(5000, console.log("Server ir running")); 
