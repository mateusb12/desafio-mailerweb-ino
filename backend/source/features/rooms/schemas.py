from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RoomRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    capacity: int = Field(gt=0)

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Nome da sala é obrigatório.")
        return value


class RoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    capacity: int
