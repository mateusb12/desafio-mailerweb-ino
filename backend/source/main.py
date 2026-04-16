from contextlib import asynccontextmanager

from fastapi import FastAPI
import uvicorn

from source.features.auth.controller import auth_bp
from source.core.config import settings
from source.core.migrations import run_migrations


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings.require_jwt_secret_key()
    run_migrations()
    yield


app = FastAPI(title="Meeting Room Booking API", lifespan=lifespan)

app.include_router(auth_bp)


@app.get("/")
def root():
    return {"message": "API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
