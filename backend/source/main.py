from contextlib import asynccontextmanager

from fastapi import FastAPI
import uvicorn

from source.core.create_db import create_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    create_db()
    yield


app = FastAPI(title="Meeting Room Booking API", lifespan=lifespan)

@app.get("/")
def root():
    return {"message": "API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
