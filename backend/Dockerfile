FROM python:3.12-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y curl \
    && pip install poetry \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml poetry.lock ./

RUN poetry config virtualenvs.create false \
    && poetry install --no-root

COPY . .