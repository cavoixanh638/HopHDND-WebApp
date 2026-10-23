FROM python:3.12-slim
WORKDIR /app
COPY source/mirror_sync/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY source/mirror_sync/sync.py .
USER 65532:65532
CMD ["python", "sync.py"]
