FROM python:3.11-slim

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

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/logos uploads/media

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
