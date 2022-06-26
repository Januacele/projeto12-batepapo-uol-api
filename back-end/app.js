import express, {json} from "express";
import cors from "cors";
import chalk from 'chalk';
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from 'joi';
import dayjs from 'dayjs';

const app = express();
app.use(cors());
app.use(express.json());

dotenv.config();

const participantsSchema = joi.object({
    name: joi.string().required()
})

//Acesso ao mongo
const client = new MongoClient(process.env.URL_CONNECT_MONGO);
let db;
//Acesso ao banco de dados test
client.connect().then(() => {
    db = client.db("uol"); 
    console.log(chalk.blue.bold("Banco de dados conectado com sucesso"));
}).catch((error) => {
    console.log(chalk.red.bold("Falha na conexão com o banco de dados"), err)
});


app.post("/participants", async (req, res) => {
    
    const name = req.body;
    const validation = participantsSchema.validate(name, { abortEarly: false})

    if(validation.error){
        console.log(validation.error.details);
        res.status(422).send("O nome não foi validado");
        return;
    }
    try {
        await db.collection("participants").insertOne(name);
        res.sendStatus(201);
    } catch (error) {
        res.status(500).send("Usuário não cadastrado!");
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



app.listen(5001, console.log("Server ir running")); 
