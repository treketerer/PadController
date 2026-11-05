from fastapi import APIRouter

router = APIRouter()

@router.post("/click")
async def click_pad():
    return []