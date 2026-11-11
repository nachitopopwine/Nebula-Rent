# ---------- build: genera stubs gRPC e instala dependencias ----------
FROM python:3.12-slim AS build
WORKDIR /app
RUN pip install --no-cache-dir grpcio-tools==1.67.1
COPY requirements.txt .
# --ignore-installed: sin esto, las dependencias que grpcio-tools ya dejó en el sistema
# (p. ej. typing_extensions) no se copian a /install y faltan en la imagen final.
RUN pip install --no-cache-dir --ignore-installed --prefix=/install -r requirements.txt
COPY proto ./proto
COPY app ./app
COPY scripts ./scripts
RUN bash scripts/gen_proto.sh

# ---------- runtime ----------
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY --from=build /install /usr/local
COPY --from=build /app/app ./app
RUN useradd --create-home bff
USER bff
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
