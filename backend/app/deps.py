from typing import List, Optional
from fastapi import Header, HTTPException, Depends, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User

def get_current_user(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
) -> User:
    if x_user_id:
        user = db.query(User).filter(User.id == x_user_id).first()
        if user:
            return user
        # Allow email matching for convenient testing
        user_by_email = db.query(User).filter(User.email == x_user_id).first()
        if user_by_email:
            return user_by_email

    # Default to first seeded BD Manager if no header provided in loose dev mode
    default_user = db.query(User).first()
    if default_user:
        return default_user
    
    # In case DB is not yet seeded, return a stub BD Manager
    return User(
        id="demo-bd-mgr-1",
        name="Karthik Ramanathan",
        email="karthik.mgr@savomart.in",
        role="bd_manager"
    )

def require_role(*allowed_roles: str):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Role '{current_user.role}' is not authorized. Required: {list(allowed_roles)}"
            )
        return current_user
    return role_checker
