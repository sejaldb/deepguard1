// detection.ts
import { Router, Request, Response } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import FormData from "form-data";

const router = Router();

// Multer setup
const upload = multer({ storage: multer.memoryStorage() });

// Session store
interface FrameRecord { frameIndex: number; fakeProbability: number; }
interface ScanSessionData { sessionId: string; startedAt: Date; status: "active"|"stopped"; frames: FrameRecord[]; type: "camera"|"screen"; }
const sessions = new Map<string, ScanSessionData>();

// Python microservice call
async function callPythonMicroservice(frameBuffer: Buffer) {
    const form = new FormData();
    form.append("file", frameBuffer, { filename: "frame.jpg" });
    const response = await axios.post("http://localhost:8001/predict", form, { headers: form.getHeaders() });
    return response.data; // { fake_probability, real_probability }
}

// Score aggregation
function aggregateScores(frames: FrameRecord[]) {
    const avgFake = frames.reduce((sum,f)=>sum+f.fakeProbability,0)/frames.length;
    const avgReal = 1 - avgFake;
    const verdict = avgFake>0.6?"deepfake":avgFake<0.4?"real":"uncertain";
    const confidence = frames.length<3?"low":frames.length<10?"medium":"high";
    const suspiciousFrames = frames.filter(f=>f.fakeProbability>0.65).map(f=>({frameIndex:f.frameIndex,fakeProbability:f.fakeProbability}));
    return { deepfakeProbability: avgFake, realProbability: avgReal, confidence, verdict, suspiciousFrames };
}

// POST /upload
router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
    const file = req.file;
    if(!file) return res.status(400).json({ error: "No file provided" });

    let frames: FrameRecord[] = [];
    // For simplicity: 1 frame for image
    const prediction = await callPythonMicroservice(file.buffer);
    frames.push({ frameIndex: 0, fakeProbability: prediction.fake_probability });

    const aggregated = aggregateScores(frames);
    res.json({ ...aggregated, framesAnalyzed: frames.length });
});

export default router;