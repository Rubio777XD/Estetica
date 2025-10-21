import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Las rutas y controladores se implementarán en siguientes iteraciones.

const port = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`API server ready on port ${port}`);
  });
}

export default app;
