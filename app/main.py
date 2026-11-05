import uvicorn
from fastapi import FastAPI

from app.api import main_router

app = FastAPI()

app.include_router(main_router)

if __name__ == "__main__":
    uvicorn.run(app, reload=True)