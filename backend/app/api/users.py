from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.user_schemas import UserResponse

router = APIRouter(prefix="/api/users", tags=["Users & Personas"])

@router.get("", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)):
    """Returns seeded users across the 4 personas for the role switcher."""
    return db.query(User).all()
