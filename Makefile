install-backend:
	cd backend && poetry install

install-frontend:
	cd frontend && npm install

install:
	make install-backend
	make install-frontend

up:
	docker compose up --build

down:
	docker compose down

lint-backend:
	cd backend && poetry run flake8 source

test-backend:
	cd backend && poetry run pytest

lint-frontend:
	cd frontend && npm run lint

migrate:
	cd backend && poetry run alembic upgrade head

makemigration:
	cd backend && poetry run alembic revision --autogenerate -m "migration"