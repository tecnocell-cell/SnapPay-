FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código
COPY . .

# Build
ARG VITE_API_URL=https://homolog.seudominio.com.br
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2 — Nginx será usado para servir, não precisa rodar aqui
# Frontend/dist será copiado para nginx volume

FROM alpine:latest
# Apenas copia o build para o volume
COPY --from=builder /app/dist /dist
RUN echo "Frontend build complete"
