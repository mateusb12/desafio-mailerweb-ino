from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/meeting_rooms"
    jwt_secret_key: str | None = None
    environment: str = "development"

    def require_jwt_secret_key(self) -> str:
        if not self.jwt_secret_key:
            raise RuntimeError("JWT_SECRET_KEY is required. Set it in the environment or in a local .env file.")
        return self.jwt_secret_key


settings = Settings()
