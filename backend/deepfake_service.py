# deepfake_service.py
from fastapi import FastAPI, UploadFile, File
from PIL import Image
from transformers import AutoImageProcessor, SiglipForImageClassification
import torch
import io

app = FastAPI(title="Deepfake Detection Service")

# Load pretrained model
model_name = "prithivMLmods/deepfake-detector-model-v1"
model = SiglipForImageClassification.from_pretrained(model_name)
processor = AutoImageProcessor.from_pretrained(model_name)

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.nn.functional.softmax(outputs.logits, dim=1).squeeze().tolist()
    return {"fake_probability": round(probs[0], 4), "real_probability": round(probs[1], 4)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)