from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from ....core.database import get_db
from ....core.deps import get_current_user
from ....models.user import User

router = APIRouter()


class UserProfileUpdate(BaseModel):
    full_name: str | None = None
    preferred_lang: str | None = None
    telegram: str | None = None
    phone: str | None = None
    whatsapp: str | None = None


class UserOut(BaseModel):
    id: str
    email: str
    role: str
    full_name: str | None
    preferred_lang: str
    telegram: str | None
    phone: str | None
    is_verified: bool
    model_config = {"from_attributes": True}


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
async def update_me(
    data: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    return user