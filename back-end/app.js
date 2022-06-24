import express, {json} from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

const app = express();
app.use(cors());
app.use(express.json());

dotenv.config();

//Acesso ao mongo
const client = new MongoClient(process.env.URL_CONNECT_MONGO);
let db;
//Acesso ao banco de dados test
client.connect().then(() => {
    db = client.db("testcamp"); 
});


app.get("/receita", (req, res) => {
    console.log("Peguei a receita");
    db.collection("receita").find().toArray().then(receita =>{
        res.send(receita);
    });
});

app.post("/receita", (req, res) => {
    console.log("Tô mandando uma receita");
    db.collection("receita").insertOne(req.body).then(() => {
        res.sendStatus(201);
    });  
});

app.listen(5001, console.log("Server ir running")); 
