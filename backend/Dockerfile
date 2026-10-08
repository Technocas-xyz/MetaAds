FROM python:3.11-slim-bookworm

WORKDIR /app

# Install system dependencies for psycopg2 + general build + curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Chromium browser + all system libraries for Playwright
# Must run AFTER pip install because the playwright package is required
RUN playwright install --with-deps chromium

# Also install Google Chrome: unlike bundled Chromium it ships the H.264 codec,
# so Meta renders real video ad creatives instead of a "trouble playing" error.
# Chrome has no Linux arm64 build, so don't fail the image build if it's missing.
RUN playwright install chrome || echo "WARNING: Google Chrome not installed - video ad creatives will be missing"

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/logos uploads/media

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
