import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from starlette.responses import RedirectResponse

from source.features.outbox.worker_runtime import worker_loop
from source.features.auth.controller import auth_bp
from source.core.config import settings
from source.core.migrations import run_migrations
from source.features.bookings.controller import bookings_bp
from source.features.dev.controller import dev_bp
from source.features.email_deliveries.controller import email_deliveries_bp
from source.features.rooms.controller import rooms_bp


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings.require_jwt_secret_key()
    run_migrations()
    worker_task = asyncio.create_task(worker_loop())
    try:
        yield
    finally:
        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="Meeting Room Booking API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_bp)
app.include_router(rooms_bp)
app.include_router(bookings_bp)
app.include_router(email_deliveries_bp)
app.include_router(dev_bp)


@app.get("/json", include_in_schema=False)
def swagger_json_redirect():
    return RedirectResponse(url="/openapi.json")


@app.get("/")
def root():
    return {"message": "API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
