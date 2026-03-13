import express from "express";
import detectionRouter from "./detection";

const app = express();
app.use(express.json({ limit: "500mb" }));
app.use("/detect", detectionRouter);

app.listen(3000, () => console.log("Node.js backend running on port 3000"));