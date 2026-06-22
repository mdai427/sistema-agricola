# Deployment Guide

## Railway (Recomendado)

### Backend + Frontend en un solo servicio

1. Crear cuenta en [railway.app](https://railway.app)
2. Nuevo proyecto → Deploy from GitHub
3. Seleccionar este repositorio
4. Agregar las variables de entorno en Railway:

| Variable | Valor |
|----------|-------|
| NODE_ENV | production |
| JWT_SECRET | (genera uno seguro) |
| PORT | (Railway lo asigna automáticamente) |

### Base de datos en Railway
1. En tu proyecto de Railway → Add Service → Database → PostgreSQL
2. Copia el `DATABASE_URL` que genera Railway
3. Agrégala como variable de entorno en tu servicio web
4. Cambia el schema.prisma de vuelta a `provider = "postgresql"` y quita la URL hardcodeada

### Comandos de build
Railway ejecuta automáticamente:
```bash
cd server && npx prisma db push && node prisma/seed.js && node src/index.js
```

## GitHub

```bash
git init
git add .
git commit -m "feat: sistema AgroMaq completo con facturación e integraciones"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/sistema-agricola.git
git push -u origin main
```
