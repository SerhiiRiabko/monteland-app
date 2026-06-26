from fastapi import APIRouter
from .endpoints import auth, lands, map, users, cms, admin_data, ai_advisor

api_router = APIRouter()

api_router.include_router(auth.router,        prefix="/auth",   tags=["auth"])
api_router.include_router(users.router,       prefix="/users",  tags=["users"])
api_router.include_router(lands.router,       prefix="/lands",  tags=["lands"])
api_router.include_router(map.router,         prefix="/map",    tags=["map"])
api_router.include_router(cms.router,         prefix="/cms",    tags=["cms"])
api_router.include_router(admin_data.router,  prefix="/admin",  tags=["admin"])
api_router.include_router(ai_advisor.router,  prefix="/ai",     tags=["ai"])