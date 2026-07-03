from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenUser(BaseModel):
    email: str
    name: str
    role: str


class LoginResponse(BaseModel):
    token: str
    user: TokenUser