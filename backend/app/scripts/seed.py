import asyncio

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.settings import WorkspaceSettings
from app.services.auth_service import hash_password


ADMIN_EMAIL = "admin@decoinks.com"
ADMIN_PASSWORD = "password"
ADMIN_NAME = "Admin User"


async def create_admin():
    """Create the default admin user if it doesn't exist."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == ADMIN_EMAIL))
        existing = result.scalar_one_or_none()

        if existing:
            print(f"[seed] Admin user already exists: {ADMIN_EMAIL}")
            return

        admin = User(
            email=ADMIN_EMAIL,
            name=ADMIN_NAME,
            hashed_password=hash_password(ADMIN_PASSWORD),
            role="admin",
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print(f"[seed] Created admin user: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        print(f"[seed]  ! CHANGE THIS PASSWORD AFTER FIRST LOGIN !")


async def seed_workspace_settings():
    """Create the default workspace settings row if it doesn't exist."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(WorkspaceSettings))
        existing = result.scalar_one_or_none()

        if existing:
            print("[seed] Workspace settings already exist")
            return

        settings_row = WorkspaceSettings()
        db.add(settings_row)
        await db.commit()
        print("[seed] Created default workspace settings")


async def main():
    await create_admin()
    await seed_workspace_settings()


if __name__ == "__main__":
    asyncio.run(main())