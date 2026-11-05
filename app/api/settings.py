from fastapi import APIRouter

router = APIRouter()

@router.post("/save")
async def save_settings():
    return []