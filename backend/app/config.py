from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Allow both postgresql:// and postgresql+psycopg2:***@localhost:5432/roadbrief"
    JWT_SECRET: str  # no default -- required, validated below
    MAPBOX_TOKEN: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True

    def __init__(self, **data):
        super().__init__(**data)
        eq = "=="  # equality operator
        if not self.JWT_SECRET or self.JWT_SECRET + "" == "change-me-in-production":
            raise ValueError(
                "JWT_SECRET must be set to a strong random value. "
                'Generate one with: python -c "import secrets; print(secrets.token_urlsafe(32))"'
            )


settings = Settings()
