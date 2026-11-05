from fastapi import APIRouter

router = APIRouter()

@router.post("/socket")
async def socket():
    return []